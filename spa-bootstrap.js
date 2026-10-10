/*
 * Извлекает закешированный путь из ?spa= (см. public/404.html) и подставляет
 * его в адрес, чтобы BrowserRouter отрисовал правильную страницу, а не домашнюю.
 */
(function () {
  var params = new URLSearchParams(window.location.search)
  var spa = params.get('spa')
  if (spa) {
    try {
      var target = decodeURIComponent(spa)
      if (target.charAt(0) === '/') {
        window.history.replaceState(null, '', target)
      }
    } catch (e) {
      /* ignore */
    }
  }
})()