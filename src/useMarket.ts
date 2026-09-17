import { useEffect, useState } from 'react'

// Free public API, no key, CORS open. ponytail: ~30 req/min limit; a few components polling every 60s stay far below it.
const API = 'https://api.geckoterminal.com/api/v2/networks/solana'

export const TIMEFRAMES = [
  { label: '24H', unit: 'minute', aggregate: 15, limit: 96 },
  { label: '7D', unit: 'hour', aggregate: 1, limit: 168 },
  { label: '30D', unit: 'hour', aggregate: 4, limit: 180 },
  { label: '1Y', unit: 'day', aggregate: 1, limit: 365 },
]

export type Candle = [time: number, open: number, high: number, low: number, close: number, volume: number]

export type Pool = {
  address: string
  name: string
  price: number
  change24h: number
  volume24h: number
  liquidity: number
  marketCap: number
}

// Identical requests within 30s share one response: the hero card and the chart both ask for 24H,
// and the free API rate-limits quickly.
const recent = new Map<string, { at: number; json: Promise<unknown> }>()
function getJson(url: string) {
  const hit = recent.get(url)
  if (hit && Date.now() - hit.at < 30_000) return hit.json as Promise<any> // eslint-disable-line @typescript-eslint/no-explicit-any
  const json = fetch(url, { headers: { accept: 'application/json' } }).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)),
  )
  json.catch(() => recent.delete(url))
  recent.set(url, { at: Date.now(), json })
  return json
}

// token mint -> its most liquid pool. Shared by every component on the page.
// ponytail: pool stats are fetched once per page load; poll here if the stat tiles must tick live.
const pools = new Map<string, Promise<Pool>>()
function loadPool(token: string) {
  let pool = pools.get(token)
  if (!pool) {
    pool = getJson(`${API}/tokens/${token}/pools?page=1`).then((json) => {
      const a = json.data?.[0]?.attributes
      if (!a) throw new Error('no pools')
      return {
        address: a.address,
        // always branded, even while TEST_TOKEN feeds the data; keep the pool's quote side (SOL, USDC…)
        name: `PUTINPUMP / ${String(a.name).split(' / ')[1] ?? 'SOL'}`,
        price: Number(a.base_token_price_usd),
        change24h: Number(a.price_change_percentage?.h24 ?? 0),
        volume24h: Number(a.volume_usd?.h24 ?? 0),
        liquidity: Number(a.reserve_in_usd ?? 0),
        marketCap: Number(a.market_cap_usd ?? a.fdv_usd ?? 0),
      }
    })
    pool.catch(() => pools.delete(token))
    pools.set(token, pool)
  }
  return pool
}

/** Pool stats plus, when `tf` is given, its price history for that timeframe (refreshed every minute). */
export function useMarket(token: string, tf: number | null = null) {
  const [pool, setPool] = useState<Pool | null>(null)
  const [data, setData] = useState<{ tf: number; list: Candle[] }>({ tf: -1, list: [] })
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    let timer = 0
    loadPool(token).then(
      (p) => alive && setPool(p),
      () => {
        if (!alive) return
        setFailed(true)
        timer = setTimeout(() => setAttempt((a) => a + 1), 15_000) // rate limit or network blip: try again by itself
      },
    )
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [token, attempt])

  useEffect(() => {
    if (!pool || tf === null) return
    let alive = true
    let retry = 0
    const { unit, aggregate, limit } = TIMEFRAMES[tf]
    const load = () =>
      getJson(`${API}/pools/${pool.address}/ohlcv/${unit}?aggregate=${aggregate}&limit=${limit}&token=${token}`).then(
        (json) => {
          if (!alive) return
          setData({ tf, list: [...json.data.attributes.ohlcv_list].reverse() }) // API sends newest first
          setFailed(false)
        },
        () => {
          if (!alive) return
          setFailed(true)
          clearTimeout(retry)
          retry = setTimeout(load, 15_000) // rate limited: don't wait for the next minute tick
        },
      )
    load()
    const timer = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(timer)
      clearTimeout(retry)
    }
  }, [pool, tf, token, attempt])

  return {
    pool,
    candles: data.tf === tf ? data.list : [], // never show another timeframe's data under the new label
    failed,
    reload: () => setAttempt((a) => a + 1),
  }
}

// Meme-coin prices run to many leading zeros: keep ~4 significant digits instead of a fixed decimal count.
export function formatPrice(p: number) {
  if (!(p > 0)) return '0'
  const decimals = Math.min(12, Math.max(2, 3 - Math.floor(Math.log10(p))))
  return p.toFixed(decimals)
}

const compactUsd = new Intl.NumberFormat('en', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })
export const formatUsd = (n: number) => compactUsd.format(n)

export const formatChange = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`

if (import.meta.env.DEV) {
  console.assert(formatPrice(2.702e-6) === '0.000002702', 'formatPrice: tiny')
  console.assert(formatPrice(0.0457) === '0.04570', 'formatPrice: small')
  console.assert(formatPrice(152.337) === '152.34', 'formatPrice: large')
  console.assert(formatChange(-3.216) === '-3.22%' && formatChange(1.2) === '+1.20%', 'formatChange')
}
