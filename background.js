const TYPE = 'EXTENSION_PROXY_FETCH'
const FETCH_TIMEOUT = 10000

const PROXY_DOMAINS = [
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
]

function isAllowedUrl(input) {
  let hostname
  try {
    hostname = new URL(input).hostname
  } catch {
    return false
  }
  return PROXY_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const { type, req } = msg
  if (type !== TYPE || !req) {
    return
  }

  ;(async () => {
    const [input, init] = req
    if (typeof input !== 'string' || !isAllowedUrl(input)) {
      sendResponse('Blocked: URL not allowed')
      return
    }

    const abortController = new AbortController()
    const timer = setTimeout(() => abortController.abort('Fetch timeout'), FETCH_TIMEOUT)
    try {
      const res = await fetch(input, { ...init, signal: abortController.signal })
      const text = await res.text()
      const headers = {}
      res.headers.forEach((value, key) => {
        // body is already decoded to text; keeping these would misdescribe the reconstructed Response
        if (key !== 'content-encoding' && key !== 'content-length') {
          headers[key] = value
        }
      })

      sendResponse({
        status: res.status,
        statusText: res.statusText,
        headers,
        text,
      })
    } catch (err) {
      sendResponse(String(err))
    } finally {
      clearTimeout(timer)
    }
  })()

  return true
})

chrome.action.onClicked.addListener(async () => {
  const url = 'https://taoli.tools'
  await chrome.tabs.create({ url })
})

const urlFilters = PROXY_DOMAINS.map((domain) => `||${domain}/`)

const rules = urlFilters.map((urlFilter, index) => ({
  id: index + 1,
  priority: index + 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      {
        header: 'origin',
        value: `https://${urlFilter.substring(2, urlFilter.length - 1)}`,
        operation: 'set',
      },
      {
        header: 'referer',
        value: `https://${urlFilter.substring(2, urlFilter.length - 1)}`,
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
