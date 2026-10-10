import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { db } from '@/lib/supabase'
import { emailForHandle, isValidNick, nickToHandle } from '@/lib/nick'
import type { Profile } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  /** Идёт ли загрузка профиля для текущего юзера (true, пока профиль ещё не отдан). */
  profileLoading: boolean
  /** Профиль текущего пользователя (строка public.profiles), если авторизован. */
  profile: Profile | null
  refreshProfile: () => Promise<void>
  /** Вход: «ник или email» + пароль. По нику подставляется синтетический адрес. */
  signIn: (identifier: string, password: string) => Promise<{ ok: boolean; message: string }>
  /** Регистрация по нику и паролю. Email создаётся автоматически внутри. */
  signUp: (nick: string, password: string) => Promise<{ ok: boolean; message: string; immediate?: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ ok: boolean; message: string }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileEntry, setProfileEntry] = useState<{ id: string; profile: Profile | null } | null>(null)

  const userId = user?.id ?? null
  // Профиль отдаём только если он принадлежит текущему юзеру (при смене
  // аккаунта старое значение не «просочится» до загрузки нового).
  const profile = profileEntry && profileEntry.id === userId ? profileEntry.profile : null
  // Пока для текущего юзера профиль ещё не запрошен/не пришёл — считаем, что идёт загрузка.
  // Это убирает мигание 404 в /booth: не решаем про права, пока роль неизвестна.
  const profileLoading = Boolean(userId) && !(profileEntry && profileEntry.id === userId)

  useEffect(() => {
    let alive = true
    void db()
      .auth.getSession()
      .then(({ data }) => {
        if (!alive) return
        setSession(data.session)
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
    const { data: sub } = db().auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setUser(next?.user ?? null)
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    let alive = true
    db()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(
        ({ data }) => {
          if (alive) setProfileEntry({ id: userId, profile: (data as Profile | null) ?? null })
        },
        () => undefined,
      )
    return () => {
      alive = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const { data } = await db().from('profiles').select('*').eq('id', userId).maybeSingle()
    setProfileEntry({ id: userId, profile: (data as Profile | null) ?? null })
  }, [userId])

  const signIn = useCallback(async (identifier: string, password: string) => {
    const value = identifier.trim()
    if (!value) return { ok: false, message: 'Введите ник или email.' }

    let email: string | null = null
    if (value.includes('@')) {
      email = value
    } else if (isValidNick(value)) {
      const handle = nickToHandle(value)
      // Реальный email берём из профиля: тогда вход по нику работает и после
      // смены ника, и для старых аккаунтов с обычной почтой.
      const { data: exact } = await db()
        .from('profiles')
        .select('auth_email')
        .eq('username', handle)
        .maybeSingle()
      email = exact?.auth_email ?? null
      if (!email) {
        const pattern = handle.replace(/([\\%_])/g, '\\$1')
        const { data: fuzzy } = await db()
          .from('profiles')
          .select('auth_email')
          .ilike('username', pattern)
          .limit(1)
          .maybeSingle()
        email = fuzzy?.auth_email ?? null
      }
      // Аккаунты, заведённые до колонки auth_email: детерминированный синтетический адрес.
      if (!email) email = emailForHandle(handle)
    }

    if (!email) {
      return {
        ok: false,
        message: 'Ник — 2–24 знака: буквы, цифры, _ . - или email с @',
      }
    }
    const { error } = await db().auth.signInWithPassword({ email, password })
    return error ? { ok: false, message: 'Неверный ник (или email) или пароль.' } : { ok: true, message: 'Готово.' }
  }, [])

  const signUp = useCallback(async (nick: string, password: string) => {
    const handle = nickToHandle(nick)
    const displayName = nick.trim()
    if (!isValidNick(nick)) {
      return {
        ok: false,
        message: 'Ник — от 2 до 24 знаков: буквы, цифры, _ . -',
      }
    }
    if (password.length < 6) return { ok: false, message: 'Пароль — минимум 6 символов.' }

    // Ник уже занят: проверяем раньше, чтобы не упереться в синтетический email.
    const taken = await db().from('profiles').select('username').eq('username', handle).maybeSingle()
    if (!taken.error && taken.data) return { ok: false, message: 'Этот ник занят — выберите другой.' }

    const email = emailForHandle(handle)
    const { data, error } = await db().auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username: handle,
          login_email: email,
        },
      },
    })
    if (error) {
      if (/already registered|email address already|already been registered|taken/i.test(error.message)) {
        return { ok: false, message: 'Этот ник занят — выберите другой.' }
      }
      return { ok: false, message: error.message }
    }
    // Supabase молча возвращает пользователя без identities, если email уже занят.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, message: 'Этот ник занят — выберите другой.' }
    }
    if (data.session) return { ok: true, message: 'Аккаунт создан — добро пожаловать!', immediate: true }
    return {
      ok: true,
      message:
        'Аккаунт создан, но в Supabase включено подтверждение email. Тут отправлять письмо некуда: отключите «Confirm email» (Authentication → Email) и зарегистрируйтесь заново.',
      immediate: false,
    }
  }, [])

  const signOut = useCallback(async () => {
    await db().auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await db().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/booth`,
    })
    return error ? { ok: false, message: error.message } : { ok: true, message: 'Письмо отправлено.' }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, session, loading, profileLoading, profile, refreshProfile, signIn, signUp, signOut, resetPassword }),
    [user, session, loading, profileLoading, profile, refreshProfile, signIn, signUp, signOut, resetPassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
