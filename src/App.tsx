import { useEffect, useRef, useState } from 'react'
import Chart, { MarketStats, PriceCard } from './Chart.tsx'

// Live contract address. Buy, chart and pump.fun links derive from it.
const CA = 'QZ7MyN1SFbrK9oFiq7xpdYdx5HT2mndryF2NYJopump'
const LINKS = {
  telegram: 'https://t.me/PutinPumpToken', // channel: announcements
  telegramChat: 'https://t.me/PutinPumpChat', // group: community chat
}
const social = { target: '_blank', rel: 'noreferrer' }

const buyUrl = CA ? `https://jup.ag/swap/SOL-${CA}` : '#how-to-buy'
const pumpUrl = CA ? `https://pump.fun/coin/${CA}` : 'https://pump.fun'
const sellUrl = CA ? `https://jup.ag/swap/${CA}-SOL` : '#how-to-buy'
const external = CA ? { target: '_blank', rel: 'noreferrer' } : {}

const TOKENOMICS = [
  { value: '1,000,000,000', label: 'Total supply', note: 'Fixed. All of it in circulation.' },
  { value: 'Burned', label: 'Liquidity', note: 'Nobody can pull it, including us.' },
  { value: 'Revoked', label: 'Mint authority', note: 'No new coins can ever be created.' },
  { value: 'Solana', label: 'Network', note: 'Fast and cheap to trade.' },
]

const FEATURES = [
  { title: 'No team tokens', body: 'Nothing held back, nothing to dump on you.' },
  { title: 'Liquidity burned', body: 'The pool is locked forever. Nobody can pull it.' },
  { title: 'Run by holders', body: 'No company, no boss. Memes decide everything.' },
]

// ponytail: placeholder split, keep in sync with the real launch
const ALLOCATION = [
  { label: 'Liquidity pool', share: 100 },
  { label: 'Team', share: 0 },
  { label: 'Presale', share: 0 },
]

const STEPS = [
  {
    title: 'Create a wallet',
    body: 'Install Phantom or Solflare. Save your seed phrase on paper and never share it.',
    link: { label: 'Get Phantom', href: 'https://phantom.com' },
  },
  { title: 'Get some SOL', body: 'Buy SOL on any exchange and send it to your wallet address.' },
  { title: 'Open Jupiter', body: 'Go to jup.ag and connect your wallet.', link: { label: 'Open Jupiter', href: 'https://jup.ag' } },
  { title: 'Swap for $PUTINPUMP', body: 'Paste the contract address, check it matches, choose an amount and confirm the swap.' },
]

const FAQ = [
  {
    q: 'What is $PUTINPUMP?',
    a: 'A meme coin on Solana. It is a joke and a community. It has no utility and no promise of profit.',
  },
  {
    q: 'Is it connected to Vladimir Putin or any government?',
    a: 'No. $PUTINPUMP is satire. It is not affiliated with, endorsed by or connected to Vladimir Putin, any government or any political organization.',
  },
  {
    q: 'Where can I buy it?',
    a: 'On Jupiter or any Solana DEX. Always use the contract address from this page and check it character by character.',
  },
  {
    q: 'Is it safe?',
    a: 'Liquidity is burned and mint authority is revoked, so supply and liquidity cannot be changed. The price can still go to zero. Only spend what you can afford to lose.',
  },
]

const ICONS = {
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  telegram:
    'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
}

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

function ContractBar() {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    navigator.clipboard.writeText(CA).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  return (
    <div className="ca">
      <span className="ca-label">Contract</span>
      <code className="ca-value">{CA || 'Posts here at launch'}</code>
      <button className="ca-copy" onClick={copy} disabled={!CA} aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  )
}

function Candles() {
  const candles = [
    [10, 250, 40],
    [60, 215, 55],
    [110, 225, 35],
    [160, 165, 80],
    [210, 120, 90],
    [260, 60, 120],
    [310, 10, 130],
  ]
  return (
    <svg className="candles" viewBox="0 0 350 320" aria-hidden="true">
      {candles.map(([x, y, h], i) => (
        <g key={x} style={{ animationDelay: `${0.3 + i * 0.08}s` }}>
          <rect x={x + 13} y={y - 14} width="4" height={h + 28} />
          <rect x={x} y={y} width="30" height={h} rx="3" />
        </g>
      ))}
    </svg>
  )
}

// Barely visible chart across the hero background, climbing left to right. Values derive from the index so renders stay pure.
function BgCandles({ count = 30 }: { count?: number }) {
  return (
    <div className="bg-candles" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const wobble = ((i * 7) % 5) * 3 - ((i * 3) % 4) * 2
        return (
          <i
            key={i}
            className={i % 4 === 2 ? 'down' : undefined}
            style={{
              left: `${(i + 0.5) * (100 / count)}%`,
              bottom: `${6 + i * 1.9 + wobble}%`,
              height: `${9 + ((i * 11) % 14)}%`,
              // two animations: entrance (staggered left to right), then the endless breathing
              animationDuration: `0.7s, ${3 + ((i * 13) % 5)}s`,
              animationDelay: `${0.3 + i * 0.05}s, ${-((i * 17) % 9)}s`,
            }}
          />
        )
      })}
    </div>
  )
}

// Decorative field of triangles drifting upward. Values derive from the index so renders stay pure.
function Rising({ count = 16 }: { count?: number }) {
  return (
    <div className="rising" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 5) % 100}%`,
            fontSize: `${10 + ((i * 7) % 16)}px`,
            animationDuration: `${7 + ((i * 13) % 8)}s`,
            animationDelay: `${-((i * 23) % 15)}s`,
          }}
        />
      ))}
    </div>
  )
}

function Marquee({ text, reverse }: { text: string; reverse?: boolean }) {
  return (
    <div className={reverse ? 'marquee marquee-reverse' : 'marquee'} aria-hidden="true">
      <div className="marquee-track">
        {Array.from({ length: 80 }, (_, i) => (
          <span key={i}>{text}</span>
        ))}
      </div>
    </div>
  )
}

// Pointer position as -1..1 CSS vars; layers in .orb shift by different amounts.
function parallax(e: React.PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--px', String(((e.clientX - r.left) / r.width) * 2 - 1))
  e.currentTarget.style.setProperty('--py', String(((e.clientY - r.top) / r.height) * 2 - 1))
}

// Track-less scrollbar: the native one is hidden on mouse devices (see CSS) and this floating thumb replaces it.
// Wheel, keyboard and touch scrolling stay native; the thumb only mirrors the position and can be dragged.
function ScrollThumb() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const thumb = ref.current!
    const root = document.documentElement
    const update = () => {
      const ratio = innerHeight / root.scrollHeight
      thumb.hidden = ratio >= 1
      thumb.style.height = `${Math.max(40, innerHeight * ratio)}px`
      const travel = innerHeight - thumb.offsetHeight
      thumb.style.translate = `0 ${(scrollY / (root.scrollHeight - innerHeight)) * travel}px`
    }
    update()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update)
    const observer = new ResizeObserver(update) // page height changes when the chart or FAQ items open
    observer.observe(document.body)
    return () => {
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
      observer.disconnect()
    }
  }, [])

  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const root = document.documentElement
    const travel = innerHeight - e.currentTarget.offsetHeight
    scrollBy({ top: (e.movementY / travel) * (root.scrollHeight - innerHeight), behavior: 'instant' })
  }

  return (
    <div
      ref={ref}
      className="scroll-thumb"
      aria-hidden="true"
      onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
      onPointerMove={drag}
    />
  )
}

// Structured data for search engines, built from the same constants the page renders, so it can't drift.
const SITE = import.meta.env.VITE_SITE_URL ?? ''
const JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'WebSite', name: 'PUTIN PUMP', alternateName: '$PUTINPUMP', url: `${SITE}/` },
    {
      '@type': 'Organization',
      name: 'PUTIN PUMP',
      url: `${SITE}/`,
      logo: `${SITE}/icon-192.png`,
      sameAs: [pumpUrl, LINKS.telegram, LINKS.telegramChat],
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ],
}).replace(/</g, '\\u003c') // keeps any "</script>" in the data from closing the tag

export default function App() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      {/* hero + marquee fill exactly one desktop screen */}
      <div className="screen">
        <header className="hero" id="top" onPointerMove={parallax}>
          <BgCandles />
          <Rising />
          {/* 2x2 grid: title | orb, then actions | price card, so the card lines up with the contract bar */}
          <div className="hero-title">
            <h1>
              <span>Putin</span> <span>Pump</span>
            </h1>
            <p className="ticker">$PUTINPUMP</p>
            <p className="lede">The strongest pump on Solana. No utility, no promises, no bears allowed.</p>
          </div>
          <div className="hero-actions">
            <ContractBar />
            <div className="cta-row">
              <a className="btn btn-green" href={buyUrl} {...external}>Buy $PUTINPUMP</a>
              <a className="btn btn-white" href="#chart">View chart</a>
              <a className="btn btn-white btn-icon" href={pumpUrl} target="_blank" rel="noreferrer" aria-label="Open on pump.fun" title="pump.fun">
                <img src="/pumpfun.png" alt="" width="128" height="128" />
                <span className="btn-label">Open on pump.fun</span>
              </a>
            </div>
            <div className="social-row">
              <a href={LINKS.telegram} {...social}><Icon name="telegram" />Join the channel</a>
              <a href={LINKS.telegramChat} {...social}><Icon name="telegram" />Talk to holders</a>
            </div>
          </div>
          <div className="orb">
            <div className="glow" />
            <div className="orbit orbit-a"><i /></div>
            <div className="orbit orbit-b"><i /><i /></div>
            <svg className="ring-text" viewBox="0 0 400 400" aria-hidden="true">
              <path id="ring" d="M200,200 m-183,0 a183,183 0 1,1 366,0 a183,183 0 1,1 -366,0" fill="none" />
              <text>
                <textPath href="#ring" textLength="1140">
                  $PUTINPUMP ▲ ON SOLANA ▲ $PUTINPUMP ▲ ON SOLANA ▲ $PUTINPUMP ▲ ON SOLANA ▲
                </textPath>
              </text>
            </svg>
            <img className="hero-photo" src="/putin-icon.jpg" width="640" height="640" fetchPriority="high" alt="$PUTINPUMP token art: Vladimir Putin in front of a rising green chart" />
            <span className="chip chip-a">Liquidity burned</span>
            <span className="chip chip-b">Mint revoked</span>
            <span className="chip chip-c">1B supply</span>
          </div>
          {CA && <PriceCard token={CA} />}
        </header>

        <Marquee text="$PUTINPUMP" />
      </div>

      <main>
        <section className="about" id="about">
          <img className="about-photo" src="/putin.jpg" width="960" height="1305" loading="lazy" decoding="async" alt="Vladimir Putin, the face of the $PUTINPUMP meme coin" />
          <div>
            <h2>What is $PUTINPUMP?</h2>
            <p>
              $PUTINPUMP is a meme coin on Solana. It does nothing, funds nothing and speaks for no one. It
              exists because green candles are funny.
            </p>
            <p>
              The supply is fixed, the liquidity is burned and there is no team allocation. The rest is up to
              the community.
            </p>
            <ul className="features">
              {FEATURES.map((f) => (
                <li key={f.title}>
                  <Icon name="check" />
                  <span>
                    <b>{f.title}</b>
                    {f.body}
                  </span>
                </li>
              ))}
            </ul>
            <a className="btn btn-blue" href={buyUrl} {...external}>Buy $PUTINPUMP</a>
          </div>
        </section>

        <section className="chart" id="chart">
          <h2>Live market</h2>
          {CA ? (
            <>
              <MarketStats token={CA} />
              <Chart token={CA} />
              <div className="cta-row trade-row">
                <a className="btn btn-green" href={buyUrl} {...external}>Buy</a>
                <a className="btn btn-red" href={sellUrl} {...external}>Sell</a>
              </div>
            </>
          ) : (
            <div className="chart-frame chart-empty">
              <Candles />
              <i className="scan" />
              <p>The live chart appears here at launch.</p>
            </div>
          )}
        </section>

        <section className="tokenomics" id="tokenomics">
          <h2>Tokenomics</h2>
          <p className="section-sub">Simple on purpose.</p>
          <dl className="cards">
            {TOKENOMICS.map((t) => (
              <div className="card" key={t.label}>
                <dt>{t.label}</dt>
                <dd className="card-value">{t.value}</dd>
                <dd>{t.note}</dd>
              </div>
            ))}
          </dl>
          <div className="allocation">
            <div className="allocation-bar">
              {ALLOCATION.filter((a) => a.share > 0).map((a) => (
                <i key={a.label} style={{ width: `${a.share}%` }} />
              ))}
            </div>
            <ul>
              {ALLOCATION.map((a) => (
                <li key={a.label}>
                  <b>{a.share}%</b> {a.label}
                </li>
              ))}
            </ul>
          </div>
          <ContractBar />
        </section>

        <section id="how-to-buy">
          <h2>How to buy</h2>
          <p className="section-sub">Four steps, about five minutes.</p>
          <ol className="cards steps">
            {STEPS.map((s) => (
              <li className="card" key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {s.link && (
                  <a className="card-link" href={s.link.href} target="_blank" rel="noreferrer">
                    {s.link.label} →
                  </a>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section className="faq" id="faq">
          <h2>FAQ</h2>
          <div className="faq-list">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <Marquee text="No bears allowed" reverse />

        <section className="community">
          <Rising count={12} />
          <h2>Join the pump</h2>
          <p>Memes, updates and the contract address, straight from the community.</p>
          <div className="cta-row">
            <a className="btn btn-white" href={LINKS.telegram} {...social}><Icon name="telegram" />Join our Telegram channel</a>
            <a className="btn btn-white" href={LINKS.telegramChat} {...social}><Icon name="telegram" />Talk to holders on Telegram</a>
            <a className="btn btn-green" href={buyUrl} {...external}>Buy $PUTINPUMP</a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          $PUTINPUMP is a meme coin made for entertainment. It has no intrinsic value and no expectation of
          financial return. It is satire, and it is not affiliated with, endorsed by or connected to Vladimir
          Putin, any government or any political organization. Crypto is volatile: never spend what you can't
          afford to lose. Nothing on this page is financial advice.
        </p>
        <p>
          Photo:{' '}
          <a href="https://commons.wikimedia.org/wiki/File:Vladimir_Putin_17-11-2021_(cropped).jpg" target="_blank" rel="noreferrer">
            The Presidential Press and Information Office (kremlin.ru)
          </a>
          , CC BY 4.0, via Wikimedia Commons. Cropped.
        </p>
      </footer>
      <ScrollThumb />
    </>
  )
}
