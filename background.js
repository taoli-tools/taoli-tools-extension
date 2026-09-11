const TYPE = 'EXTENSION_PROXY_FETCH'
const FETCH_TIMEOUT = 10000

// mode 为 'json' 时 2xx 的正文在这里就解析成对象再回传. runtime 消息本身走 JSON 序列化,
// 传对象和传原文的长度一样, 却省掉了把正文当字符串转义的膨胀, 页面反序列化出来的直接就是最终对象,
// 不用再持有一份正文字符串二次解析. 非 2xx 和解析失败时退回原文, 页面拿 text 拼错误信息
async function proxyFetch({ req, mode }) {
  const abortController = new AbortController()
  const timer = setTimeout(() => abortController.abort('Fetch timeout'), FETCH_TIMEOUT)
  try {
    const [input, init = {}] = req
    const res = await fetch(input, { ...init, signal: abortController.signal })
    const text = await res.text()
    const result = {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
    }
    if (mode === 'json' && res.ok) {
      try {
        return { ...result, json: JSON.parse(text) }
      } catch {}
    }
    return { ...result, text }
  } finally {
    clearTimeout(timer)
  }
}

const onMessage = (msg, _sender, sendResponse) => {
  if (!msg || msg.type !== TYPE || !msg.req) {
    return
  }
  proxyFetch(msg).then(sendResponse, (err) => sendResponse(String(err)))
  return true
}

// 网页通过 externally_connectable 直接发到这里, 不经过 content script
chrome.runtime.onMessageExternal.addListener(onMessage)

chrome.action.onClicked.addListener(async () => {
  const url = 'https://taoli.tools'
  await chrome.tabs.create({ url })
})

// 网站自己校验 origin 的接口 (如 CoinBase/OKX 默认只认自己域名的请求), 浏览器发起时
// origin 是任务栏里 taoli.tools (或 chrome-extension 本身), 会被拒. DNR 规则统一
// 把 origin/referer 改写成目标域名自身, 个别接口认别的 origin (如 Uniswap 的
// interface gateway 只回 app.uniswap.org), 在这里单独指定
const headerRules = [
  ...[
    'larksuite.com',
    '48.club',
    'gate.io',
    'gate.com',
    'gateio.ws',
    'bitget.com',
    'binance.com',
    'coinbase.com',
    'okx.com',
    'apex.exchange',
    'bybit.com',
    'mexc.com',
    'backpack.exchange',
    'asterdex.com',
    'grvt.io',
    'pacifica.fi',
    'extended.exchange',
    'standx.com',
  ].map((domain) => ({ urlFilter: `||${domain}/`, origin: `https://${domain}` })),
  { urlFilter: '||interface.gateway.uniswap.org/', origin: 'https://app.uniswap.org' },
  { urlFilter: '||explorer.pancakeswap.com/', origin: 'https://pancakeswap.finance' },
]

const rules = headerRules.map(({ urlFilter, origin }, index) => ({
  id: index + 1,
  priority: index + 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      {
        header: 'origin',
        value: origin,
        operation: 'set',
      },
      {
        header: 'referer',
        value: origin,
        operation: 'set',
      },
    ],
  },
  condition: {
    initiatorDomains: [chrome.runtime.id],
    urlFilter,
    resourceTypes: ['xmlhttprequest'],
  },
}))

const ruleIds = rules.map(({ id }) => id)

async function applyCorsRelaxerRules() {
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds,
      addRules: rules,
    })
  } catch (error) {
    console.error('Failed to update CORS relaxer rules', error)
  }
}

const ensureRules = () => {
  applyCorsRelaxerRules().catch((error) => {
    console.error('Unexpected error while applying CORS relaxer rules', error)
  })
}

chrome.runtime.onInstalled.addListener(ensureRules)
chrome.runtime.onStartup.addListener(ensureRules)

ensureRules()
