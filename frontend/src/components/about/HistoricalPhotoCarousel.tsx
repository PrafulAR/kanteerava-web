import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import type { HistoricalPhoto } from './historicalPhotos'
import './HistoricalPhotoCarousel.css'

type HistoricalPhotoCarouselProps = {
  photos: readonly HistoricalPhoto[]
}

type SwipeStart = {
  pointerId: number
  x: number
  y: number
}

const normalizeIndex = (index: number, length: number) =>
  length === 0 ? 0 : ((index % length) + length) % length

const getRelativePosition = (index: number, activeIndex: number, length: number) => {
  let distance = index - activeIndex

  if (distance > length / 2) distance -= length
  if (distance < -length / 2) distance += length

  return distance >= -2 && distance <= 2 ? distance : 'hidden'
}

export function HistoricalPhotoCarousel({ photos }: HistoricalPhotoCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const swipeStartRef = useRef<SwipeStart | null>(null)
  const didSwipeRef = useRef(false)
  const photoCount = photos.length
  const normalizedActiveIndex = normalizeIndex(activeIndex, photoCount)
  const activePhoto = photos[normalizedActiveIndex]

  const move = useCallback(
    (step: number) => {
      if (photoCount < 2) return
      setActiveIndex((current) => normalizeIndex(current + step, photoCount))
    },
    [photoCount],
  )

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
    if (photoCount < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return

    didSwipeRef.current = false
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

    didSwipeRef.current = true
    move(horizontalDistance < 0 ? 1 : -1)
  }

  const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <section className="historical-carousel page-section" aria-labelledby="historical-carousel-heading">
      <div className="historical-carousel__heading">
        <span className="section-kicker">Kanteerava through the years</span>
        <h2 id="historical-carousel-heading">
          Our <em>memories.</em>
        </h2>
        <p>A glimpse into the moments and memories that shaped our journey.</p>
      </div>

      {photoCount === 0 || !activePhoto ? (
        <div className="historical-carousel__empty">Historical photographs will be added here.</div>
      ) : (
        <div
          className="historical-carousel__shell"
          role="region"
          aria-roledescription="carousel"
          aria-label="Kanteerava historical photographs"
          tabIndex={0}
          onKeyDown={handleKeyDown}
        >
          <div
            className="historical-carousel__stage"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            {photos.map((photo, index) => {
              const position = getRelativePosition(index, normalizedActiveIndex, photoCount)
              const isActive = position === 0
              const isVisible = position !== 'hidden'

              return (
                <button
                  className="historical-carousel__slide"
                  data-position={position}
                  type="button"
                  key={photo.id}
                  aria-label={isActive ? `Current photograph: ${photo.alt}` : `Show photograph: ${photo.alt}`}
                  aria-hidden={!isVisible}
                  tabIndex={isVisible && !isActive ? 0 : -1}
                  onClick={() => {
                    if (didSwipeRef.current) {
                      didSwipeRef.current = false
                      return
                    }
                    setActiveIndex(index)
                  }}
                >
                  <span className="historical-carousel__frame">
                    <img
                      className="historical-carousel__backdrop"
                      src={photo.src}
                      alt=""
                      aria-hidden="true"
                      draggable="false"
                      loading={isActive ? 'eager' : 'lazy'}
                    />
                    <span className="historical-carousel__wash" aria-hidden="true" />
                    <img
                      className="historical-carousel__image"
                      src={photo.src}
                      alt={isActive ? photo.alt : ''}
                      draggable="false"
                      loading={isActive || Math.abs(Number(position)) === 1 ? 'eager' : 'lazy'}
                    />
                  </span>
                </button>
              )
            })}
          </div>

          {photoCount > 1 && (
            <div className="historical-carousel__controls" aria-label="Historical photograph navigation">
              <button type="button" onClick={() => move(-1)} aria-label="Show previous historical photograph">
                <span aria-hidden="true">←</span>
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Show next historical photograph">
                <span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          <div className="historical-carousel__details" aria-live="polite" aria-atomic="true">
            <div className="historical-carousel__meta">
              {activePhoto.year && <span>{activePhoto.year}</span>}
              <span>
                {String(normalizedActiveIndex + 1).padStart(2, '0')} / {String(photoCount).padStart(2, '0')}
              </span>
            </div>
            {activePhoto.caption && <p>{activePhoto.caption}</p>}
          </div>

          {photoCount > 1 && (
            <div className="historical-carousel__dots" role="group" aria-label="Choose a historical photograph">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  className={index === normalizedActiveIndex ? 'is-active' : ''}
                  aria-label={`Show photograph ${index + 1} of ${photoCount}`}
                  aria-current={index === normalizedActiveIndex ? 'true' : undefined}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
