import { useEffect, useRef, useState } from 'react'
import { TIMEFRAMES, formatChange, formatPrice, formatUsd, useMarket } from './useMarket.ts'

const trend = (pct: number) => (pct >= 0 ? 'up' : 'down')

/** Glass card for the hero: pair, price, 24h change, sparkline, three key stats. */
export function PriceCard({ token }: { token: string }) {
  const { pool, candles } = useMarket(token, 0)
  const closes = candles.map((c) => c[4])
  const min = Math.min(...closes)
  const span = Math.max(...closes) - min || 1
  const line = closes
    .map((p, i) => `${i ? 'L' : 'M'}${((i / (closes.length - 1)) * 300).toFixed(1)},${(38 - ((p - min) / span) * 36).toFixed(1)}`)
    .join('')
  const stats = [
    { label: '24h volume', value: pool && formatUsd(pool.volume24h) },
    { label: 'Liquidity', value: pool && formatUsd(pool.liquidity) },
    { label: 'Market cap', value: pool && formatUsd(pool.marketCap) },
  ]
  return (
    <a className={`price-card ${trend(pool?.change24h ?? 0)}`} href="#chart" aria-label="Live price. Open the chart">
      <span className="pc-head">
        <span>{pool?.name ?? 'Loading…'}</span>
        <span className="pc-live">
          <i />
          Live · 24h
        </span>
      </span>
      <span className="pc-main">
        <b>{pool ? `$${formatPrice(pool.price)}` : '—'}</b>
        {pool && <span className="pc-change">{formatChange(pool.change24h)}</span>}
      </span>
      <svg viewBox="0 0 300 40" aria-hidden="true">
        {closes.length > 1 && (
          // key restarts the draw animation when a new series arrives
          <path key={candles[0][0]} className="spark-line" d={line} pathLength={1} />
        )}
      </svg>
      <span className="pc-stats">
        {stats.map((s) => (
          <span key={s.label}>
            <small>{s.label}</small>
            {s.value || '—'}
          </span>
        ))}
      </span>
    </a>
  )
}

export function MarketStats({ token }: { token: string }) {
  const { pool } = useMarket(token)
  const stats = [
    { label: 'Price', value: pool && `$${formatPrice(pool.price)}` },
    { label: '24h change', value: pool && formatChange(pool.change24h), className: pool ? trend(pool.change24h) : '' },
    { label: '24h volume', value: pool && formatUsd(pool.volume24h) },
    { label: 'Liquidity', value: pool && formatUsd(pool.liquidity) },
    { label: 'Market cap', value: pool && formatUsd(pool.marketCap) },
  ]
  return (
    <dl className="stats">
      {stats.map((s) => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd className={s.className}>{s.value || '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Minimal area chart of closing prices. */
export default function Chart({ token }: { token: string }) {
  const [tf, setTf] = useState(0)
  const { pool, candles, failed, reload } = useMarket(token, tf)
  const [hover, setHover] = useState<number | null>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const plotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: Math.floor(entry.contentRect.width), h: Math.floor(entry.contentRect.height) }),
    )
    observer.observe(plotRef.current!)
    return () => observer.disconnect()
  }, [])

  const { w, h } = size
  const n = candles.length
  const ready = n > 1 && w > 0
  const plotH = Math.max(0, h - 24)
  const closes = candles.map((c) => c[4])
  let min = Math.min(...closes)
  let max = Math.max(...closes)
  const pad = (max - min) * 0.12 || max * 0.01
  min -= pad
  max += pad
  const x = (i: number) => (i / (n - 1)) * w
  const y = (price: number) => ((max - price) / (max - min)) * plotH
  const line = closes.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join('')

  const first = closes[0]
  const last = closes[n - 1]
  // 24H uses the API's own figure so it matches the stat tiles and the hero card
  const change = tf === 0 && pool ? pool.change24h : ready ? ((last - first) / first) * 100 : 0
  const point = hover !== null && hover < n ? hover : null

  const timeLabel = (t: number, full = false) =>
    new Date(t * 1000).toLocaleString('en', {
      ...(full || tf > 0 ? { month: 'short', day: 'numeric' } : {}),
      ...(full || tf === 0 ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    })

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left
    setHover(Math.min(n - 1, Math.max(0, Math.round((px / w) * (n - 1)))))
  }

  const timeTicks = w < 520 ? 3 : 5

  return (
    <div className={`chart-box ${trend(change)}`}>
      <div className="chart-head">
        <div>
          <p className="chart-pair">{pool?.name ?? 'Loading…'}</p>
          {ready && (
            <p className="chart-price">
              ${formatPrice(point !== null ? closes[point] : last)}
              {point !== null ? (
                <small>{timeLabel(candles[point][0], true)}</small>
              ) : (
                <span>
                  {formatChange(change)} <small>{TIMEFRAMES[tf].label}</small>
                </span>
              )}
            </p>
          )}
        </div>
        <div className="chart-tf" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((t, i) => (
            <button key={t.label} aria-pressed={i === tf} onClick={() => setTf(i)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="chart-plot" ref={plotRef}>
        {ready ? (
          <svg
            width={w}
            height={h}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            onPointerCancel={() => setHover(null)}
            role="img"
            aria-label={`${pool?.name} price, ${TIMEFRAMES[tf].label}: $${formatPrice(last)}, ${formatChange(change)}`}
          >
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="currentColor" stopOpacity="0.35" />
                <stop offset="1" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="area" d={`${line}L${w},${plotH}L0,${plotH}Z`} />
            <path className="line" d={line} />
            {Array.from({ length: timeTicks }, (_, k) => {
              const i = Math.round(((k + 0.5) / timeTicks) * (n - 1))
              return (
                <text key={k} className="axis" x={x(i)} y={h - 4} textAnchor="middle">
                  {timeLabel(candles[i][0])}
                </text>
              )
            })}
            {point !== null && (
              <>
                <line className="cross" x1={x(point)} x2={x(point)} y1="0" y2={plotH} />
                <circle className="dot" cx={x(point)} cy={y(closes[point])} r="5" />
              </>
            )}
          </svg>
        ) : (
          <p className="chart-state">
            {failed ? (
              <>
                Chart data is unavailable right now. <button onClick={reload}>Try again</button>
              </>
            ) : (
              'Loading chart…'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
