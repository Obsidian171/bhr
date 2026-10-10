import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Ловит ошибки рендера, чтобы вместо белого экрана показать понятное сообщение.
 * Кнопка перезагружает страницу — это надёжнее сброса состояния.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Не удалось отобразить страницу:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Что-то пошло не так</h1>
          <p className="mt-2 text-sm text-muted">
            Страница не смогла загрузиться. Обновите её — скорее всего, это поможет.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    )
  }
}
