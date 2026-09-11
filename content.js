// 只负责把 injected.js 注入页面, 让页面拿到插件 id 后经 externally_connectable 直连 background
const s = document.createElement('script')
s.src = chrome.runtime.getURL('injected.js')
;(document.documentElement || document.head || document.body).appendChild(s)
s.remove()
