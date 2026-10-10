// Ставится до отрисовки, чтобы тёмная тема не мигала. Отдельный файл, а не
// инлайн в index.html: так CSP может обходиться без 'unsafe-inline' для скриптов.
;(function () {
  try {
    var saved = localStorage.getItem('bhr.theme')
    if (!saved) {
      saved = 'light'
      localStorage.setItem('bhr.theme', saved)
    }
    if (saved === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.style.colorScheme = 'dark'
    } else {
      document.documentElement.style.colorScheme = 'light'
    }
  } catch (e) {
    /* приватный режим браузера — просто светлая тема */
  }
})()
