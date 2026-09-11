# Taoli Tools Extension

taoli.tools 页面的取数代理:页面把 `[input, init]` 经 `chrome.runtime.sendMessage`
(`EXTENSION_PROXY_FETCH`,见 injected.js 与 site 的 `app/utils/network.ts`)发到
background,由 background 直接 fetch。background 带 `host_permissions: *://*/*`
不受 CORS 限制,而页面 fetch 改不了 `origin`/`referer` 这类 forbidden 头,所以在
这里用 declarativeNetRequest 的 `modifyHeaders` 规则改写:默认把请求的 origin/referer
设成目标域名自身,个别只认别的 origin 的接口单独指定 —— 目前有
`interface.gateway.uniswap.org`(改成人 app.uniswap.org,Uniswap 官方 interface 背后的
GraphQL gateway,免 API key)和 `explorer.pancakeswap.com`(改成
pancakeswap.finance,PancakeSwap 池子索引)。规则在 install/startup/每次 SW 唤醒时
(`ensureRules`)刷新,匹配条件 `initiatorDomains: [chrome.runtime.id]` 只有
background 自己发起的请求命中。

装法:`chrome://extensions` 开发者模式加载本目录,版本号在 `manifest.json` 里手动递增。
没有插件时页面所有 https 取数走浏览器直连,受 CORS 限制的接口(上面那些域名)不可用。
