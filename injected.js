;(() => {
  // 本脚本从 chrome-extension://<id>/injected.js 加载, 网页用这个 id 通过 externally_connectable 直连 background
  const src = document.currentScript?.src
  globalThis.TaoliToolsExtension = { id: src ? new URL(src).host : undefined }
})()
