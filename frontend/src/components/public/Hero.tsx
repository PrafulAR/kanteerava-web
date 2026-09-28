import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import currentHero from '../../assets/hero-v2-enhanced.png'
import guideActivityHero from '../../assets/hero-guide-activity.webp'
import mountainGroupHero from '../../assets/hero-mountain-group.webp'
import templeGroupHero from '../../assets/hero-temple-group.webp'

export type HealthStatus = 'checking' | 'online' | 'offline'

interface HeroProps {
  status: HealthStatus
}

const healthStatusLabels: Record<HealthStatus, string> = {
  checking: 'Backend status: checking',
  online: 'Backend status: online',
  offline: 'Backend status: unavailable',
}

const heroSlides = [
  { src: currentHero, className: 'hero-slide-current' },
  { src: guideActivityHero, className: 'hero-slide-guides' },
  { src: mountainGroupHero, className: 'hero-slide-mountain' },
  { src: templeGroupHero, className: 'hero-slide-temple' },
]

export function Hero({ status }: HeroProps) {
  const [activeSlide, setActiveSlide] = useState(0)
  const [timerVersion, setTimerVersion] = useState(0)

  useEffect(() => {
    const nextImage = new Image()
    nextImage.src = heroSlides[(activeSlide + 1) % heroSlides.length].src
  }, [activeSlide])

  useEffect(() => {
    const timer = window.setTimeout(() => setActiveSlide((current) => (current + 1) % heroSlides.length), 10000)
    return () => window.clearTimeout(timer)
  }, [activeSlide, timerVersion])

  const selectSlide = (index: number) => {
    setActiveSlide(index)
    setTimerVersion((current) => current + 1)
  }

  return (
    <>
      <div className="hero-slideshow" aria-hidden="true">
        {heroSlides.map((slide, index) => <img className={`hero-slide ${slide.className}${index === activeSlide ? ' is-active' : ''}`} src={slide.src} alt="" loading={index === 0 ? 'eager' : 'lazy'} fetchPriority={index === 0 ? 'high' : 'low'} key={slide.src} />)}
      </div>
      <div className="hero-content">
        <p className="kicker">Adventure starts with belonging</p>
        <h1 className="hero-title"><span>Growing</span><span>confident</span><span>young <em>leaders.</em></span></h1>
        <p className="intro">A home for Scouts, Guides, leaders, and the stories we make together.</p>
        <div className="hero-actions">
          <Link className="action-button" to="/programmes">Explore programmes</Link>
          <Link className="text-link" to="/about">Our story <span>↗</span></Link>
        </div>
        <div className={`api-status api-status-${status}`} role="status" aria-label={healthStatusLabels[status]} title={healthStatusLabels[status]}><span className="dot" aria-hidden="true" /></div>
      </div>
      <div className="hero-carousel-controls" aria-label="Choose hero photograph">{heroSlides.map((_, index) => <button type="button" className={index === activeSlide ? 'is-active' : ''} onClick={() => selectSlide(index)} aria-label={`Show photograph ${index + 1}`} aria-pressed={index === activeSlide} key={index}><span>{String(index + 1).padStart(2, '0')}</span><i aria-hidden="true" /></button>)}</div>
      <div className="hero-scroll">Scroll to explore <span>↓</span></div>
    </>
  )
}
