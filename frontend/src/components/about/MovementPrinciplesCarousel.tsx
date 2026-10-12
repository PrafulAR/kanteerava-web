import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import dharmaDoodle from '../../assets/dharma.png'
import dutyToOthersDoodle from '../../assets/duty to others.png'
import dutyToSelfDoodle from '../../assets/duty to self.png'
import './MovementPrinciplesCarousel.css'

type Principle = {
  title: string
  description: string
  image: string
  imageAlt: string
}

type SwipeStart = {
  pointerId: number
  x: number
  y: number
}

const principles: readonly Principle[] = [
  {
    title: 'Duty to Self',
    description: 'Taking responsibility for our own personal growth, character and development.',
    image: dutyToSelfDoodle,
    imageAlt: 'Scout looking upward',
  },
  {
    title: 'Duty to Others',
    description:
      'Serving our country and community, promoting peace, understanding and cooperation, respecting others and protecting the natural world.',
    image: dutyToOthersDoodle,
    imageAlt: 'Three people embracing',
  },
  {
    title: 'Dharma',
    description:
      'Living by spiritual principles, remaining faithful to the beliefs that express them, and fulfilling the responsibilities they inspire.',
    image: dharmaDoodle,
    imageAlt: 'Lotus symbol representing Dharma',
  },
]

const normalizeIndex = (index: number) => (index + principles.length) % principles.length

export function MovementPrinciplesCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const swipeStartRef = useRef<SwipeStart | null>(null)

  const move = useCallback((step: number) => {
    setActiveIndex((current) => normalizeIndex(current + step))
  }, [])

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      move(-1)
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      move(1)
    }
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    swipeStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current
    swipeStartRef.current = null

    if (!start || start.pointerId !== event.pointerId) return

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const horizontalDistance = event.clientX - start.x
    const verticalDistance = event.clientY - start.y

    if (Math.abs(horizontalDistance) < 44 || Math.abs(horizontalDistance) <= Math.abs(verticalDistance) * 1.15) {
      return
    }

    move(horizontalDistance < 0 ? 1 : -1)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className="movement-principles" aria-labelledby="movement-principles-heading">
      <div
        className="movement-principles__shell"
        role="region"
        aria-roledescription="carousel"
        aria-label="Principles of the Scout Movement"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <p className="movement-principles__kicker" id="movement-principles-heading">
          Principles of the Movement
        </p>

        <div
          className="movement-principles__viewport"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          <div
            className="movement-principles__track"
            style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
          >
            {principles.map((principle, index) => (
              <article
                className="movement-principles__slide"
                key={principle.title}
                aria-hidden={index !== activeIndex}
              >
                <img
                  className="movement-principles__image"
                  src={principle.image}
                  alt={principle.imageAlt}
                  draggable="false"
                />
                <h3>{principle.title}</h3>
                <p>{principle.description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="movement-principles__navigation">
          <button type="button" onClick={() => move(-1)} aria-label="Show previous principle">
            <span aria-hidden="true">←</span>
          </button>

          <div className="movement-principles__progress">
            <span className="movement-principles__counter" aria-live="polite" aria-atomic="true">
              {String(activeIndex + 1).padStart(2, '0')} / {String(principles.length).padStart(2, '0')}
            </span>
            <div className="movement-principles__dots" role="group" aria-label="Choose a principle">
              {principles.map((principle, index) => (
                <button
                  type="button"
                  key={principle.title}
                  className={index === activeIndex ? 'is-active' : ''}
                  aria-label={`Show ${principle.title}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>

          <button type="button" onClick={() => move(1)} aria-label="Show next principle">
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  )
}
