/**
 * Stellar Playground — Embed Script
 *
 * Drop this script on any page, then place a div wherever you want the playground:
 *
 *   <div class="stellar-embed" data-code="BASE64_ENCODED_CODE"></div>
 *
 * The script replaces each div with an iframe pointing to the playground in embed mode.
 * The iframe auto-resizes to fit its content via postMessage.
 *
 * Optional attributes on the div:
 *   data-height="500"   — initial iframe height in px before content loads (default: 500)
 */
(function () {
  const PLAYGROUND = 'https://kaankacar.github.io/stellar-playground/index.html'

  function buildIframe(code, initialHeight) {
    const src = `${PLAYGROUND}?embed=1&code=${encodeURIComponent(code)}`
    const iframe = document.createElement('iframe')
    iframe.src = src
    iframe.width = '100%'
    iframe.height = initialHeight
    iframe.frameBorder = '0'
    iframe.style.cssText = 'display:block;border-radius:8px;overflow:hidden;border:1px solid #2a3042;'
    iframe.allow = 'clipboard-write'
    return iframe
  }

  function mount() {
    const divs = document.querySelectorAll('div.stellar-embed[data-code]')
    divs.forEach(function (div) {
      const code          = div.dataset.code
      const initialHeight = div.dataset.height || '500'
      const iframe        = buildIframe(code, initialHeight)
      div.parentNode.replaceChild(iframe, div)
    })
  }

  // Auto-resize iframes when they report their content height
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'stellar-playground') return
    const height = event.data.height
    if (!height || typeof height !== 'number') return

    // Find the iframe that sent this message
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach(function (iframe) {
      try {
        if (iframe.contentWindow === event.source) {
          iframe.height = Math.ceil(height)
        }
      } catch (e) {}
    })
  })

  // Run on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
})()
