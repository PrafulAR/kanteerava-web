import { useEffect, useMemo, useRef, useState } from 'react'
import { galleryImageUrl, getGalleryPhotos, type GalleryAlbum, type GalleryPhoto } from '../../api/galleryApi'
import { galleryCategoryLabel } from '../../config/gallery'

interface GalleryFeedProps { albums: GalleryAlbum[]; loading: boolean; error: boolean }
type AlbumFilter = 'ALL' | GalleryAlbum['category']

export function GalleryFeed({ albums, loading, error }: GalleryFeedProps) {
  const [filter, setFilter] = useState<AlbumFilter>('ALL')
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null)
  const lightboxCloseRef = useRef<HTMLButtonElement>(null)
  const lightboxTriggerRef = useRef<HTMLButtonElement | null>(null)
  const filteredAlbums = useMemo(() => filter === 'ALL' ? albums : albums.filter((album) => (album.category || 'DOMESTIC') === filter), [albums, filter])

  const closeLightbox = () => {
    setLightboxPhoto(null)
    window.requestAnimationFrame(() => lightboxTriggerRef.current?.focus())
  }

  useEffect(() => {
    if (!lightboxPhoto) return
    lightboxCloseRef.current?.focus()
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'Tab') {
        event.preventDefault()
        lightboxCloseRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleDialogKeys)
    return () => window.removeEventListener('keydown', handleDialogKeys)
  }, [lightboxPhoto])

  const openAlbum = (album: GalleryAlbum) => {
    setSelectedAlbum(album); setPhotosLoading(true); setPhotosError(false)
    getGalleryPhotos(album.id).then((response) => setPhotos(response.data.data)).catch(() => setPhotosError(true)).finally(() => setPhotosLoading(false))
  }

  return <section className="gallery-band page-section" id="gallery">
    <div className="gallery-heading"><div><p className="kicker">XVK field notes</p><h2>Stories worth<br /><em>returning to.</em></h2></div><p className="gallery-heading-copy">A living record of campfires, service days, trails, and the people who make this group feel like home.</p></div>
    {!selectedAlbum && <div className="gallery-filters" role="group" aria-label="Filter gallery albums">{(['ALL', 'DOMESTIC', 'INTERNATIONAL'] as AlbumFilter[]).map((option) => <button className={filter === option ? 'active' : ''} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} key={option}>{option === 'ALL' ? 'All' : galleryCategoryLabel(option)}</button>)}</div>}
    {loading && <p className="event-state">Loading gallery...</p>}
    {error && <p className="event-state">Unable to load the gallery. Please try again.</p>}
    {!loading && !error && !selectedAlbum && albums.length === 0 && <p className="event-state">No gallery albums available yet.</p>}
    {!loading && !error && !selectedAlbum && albums.length > 0 && filteredAlbums.length === 0 && <p className="event-state">No {galleryCategoryLabel(filter).toLowerCase()} albums are available yet.</p>}
    {!loading && !error && !selectedAlbum && filteredAlbums.length > 0 && <div className="gallery-list">{filteredAlbums.map((album, index) => <article className={`gallery-card gallery-card-${index % 4}`} key={album.id}><button type="button" onClick={() => openAlbum(album)}>{album.cover_image ? <img src={galleryImageUrl(album.cover_image)} alt="" loading="lazy" decoding="async" /> : <div className="gallery-placeholder">XVK</div>}<div className="gallery-card-body"><div className="gallery-card-meta"><small>{galleryCategoryLabel(album.category)}</small><small>{album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}</small></div><h3>{album.title}</h3><p>{album.description || 'A collection from the group.'}</p><span className="gallery-card-link">Open journal <b>→</b></span></div></button></article>)}</div>}
    {selectedAlbum && <div className="gallery-album-view"><div className="album-topline"><button className="review-action" type="button" onClick={() => setSelectedAlbum(null)}>← All albums</button><span>{photos.length} moments</span></div><div className="album-title"><p className="kicker">Photo journal / {galleryCategoryLabel(selectedAlbum.category)}</p><h3>{selectedAlbum.title}</h3><p>{selectedAlbum.description || 'A collection of moments from Kanteerava.'}</p></div>{photosLoading && <p className="event-state">Loading photos...</p>}{photosError && <p className="event-state">Unable to load photos. Please try again.</p>}{!photosLoading && !photosError && photos.length === 0 && <p className="event-state">No public photos in this album yet.</p>}{!photosLoading && !photosError && photos.length > 0 && <div className="photo-grid">{photos.map((photo, index) => <button className={`photo-tile photo-tile-${index % 5}`} type="button" key={photo.id} onClick={(event) => { lightboxTriggerRef.current = event.currentTarget; setLightboxPhoto(photo) }}><img src={galleryImageUrl(photo.image)} alt={photo.caption || selectedAlbum.title} loading="lazy" decoding="async" /><span><strong>{photo.caption || 'A moment from Kanteerava'}</strong>{photo.event_title && <small>{photo.event_title}</small>}</span></button>)}</div>}</div>}
    {lightboxPhoto && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={lightboxPhoto.caption || 'Gallery photo'} onClick={closeLightbox}><button ref={lightboxCloseRef} className="lightbox-close" type="button" onClick={closeLightbox} aria-label="Close preview">×</button><div className="lightbox-content" onClick={(event) => event.stopPropagation()}><img src={galleryImageUrl(lightboxPhoto.image)} alt={lightboxPhoto.caption || selectedAlbum?.title || 'Gallery photo'} /><div><strong>{lightboxPhoto.caption || selectedAlbum?.title}</strong>{lightboxPhoto.event_title && <span>{lightboxPhoto.event_title}</span>}</div></div></div>}
  </section>
}
