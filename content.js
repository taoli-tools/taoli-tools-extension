const s = document.createElement('script')
s.src = chrome.runtime.getURL('injected.js')
;(document.documentElement || document.head || document.body).appendChild(s)
s.remove()

const TYPE = 'EXTENSION_PROXY_FETCH'

// 兼容还在用 postMessage 的旧版网页. 新版网页拿到 injected.js 暴露的 id 后直连 background, 不会走到这里
globalThis.addEventListener('message', async ({ source, data }) => {
  if (source !== window) {
    return
  }
  const { type, id, req, mode } = data
  if (type !== TYPE || !req) {
    return
  }
  try {
    const res = await chrome.runtime.sendMessage({ type: TYPE, req, mode })
    globalThis.postMessage({ type: TYPE, id, res }, '*')
  } catch (err) {
    globalThis.postMessage({ type: TYPE, id, res: String(err) }, '*')
  }
})
