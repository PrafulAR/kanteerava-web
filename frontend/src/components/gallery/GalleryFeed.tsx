import { useEffect, useState } from 'react'
import { galleryImageUrl, getGalleryPhotos, type GalleryAlbum, type GalleryPhoto } from '../../api/galleryApi'

interface GalleryFeedProps {
  albums: GalleryAlbum[]
  loading: boolean
  error: boolean
}

export function GalleryFeed({ albums, loading, error }: GalleryFeedProps) {
  const [selectedAlbum, setSelectedAlbum] = useState<GalleryAlbum | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(false)
  const [photosError, setPhotosError] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setLightboxPhoto(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const openAlbum = (album: GalleryAlbum) => {
    setSelectedAlbum(album)
    setPhotosLoading(true)
    setPhotosError(false)
    getGalleryPhotos(album.id).then((response) => setPhotos(response.data.data)).catch(() => setPhotosError(true)).finally(() => setPhotosLoading(false))
  }

  return <section className="gallery-band page-section" id="gallery">
    <div className="gallery-heading"><div><p className="kicker">XVK field notes</p><h2>Stories worth<br /><em>returning to.</em></h2></div><p className="gallery-heading-copy">A living record of campfires, service days, trails, and the people who make this group feel like home.</p></div>
    {loading && <p className="event-state">Loading gallery...</p>}
    {error && <p className="event-state">Unable to load the gallery. Please try again.</p>}
    {!loading && !error && !selectedAlbum && albums.length === 0 && <p className="event-state">No gallery albums available yet.</p>}
    {!loading && !error && !selectedAlbum && albums.length > 0 && <div className="gallery-list">{albums.map((album, index) => <article className={`gallery-card gallery-card-${index % 4}`} key={album.id}><button type="button" onClick={() => openAlbum(album)}>{album.cover_image ? <img src={galleryImageUrl(album.cover_image)} alt="" /> : <div className="gallery-placeholder">XVK</div>}<div className="gallery-card-body"><div className="gallery-card-meta"><small>Album {String(index + 1).padStart(2, '0')}</small><small>{album.photo_count} {album.photo_count === 1 ? 'photo' : 'photos'}</small></div><h3>{album.title}</h3><p>{album.description || 'A collection from the group.'}</p><span className="gallery-card-link">Open journal <b>→</b></span></div></button></article>)}</div>}
    {selectedAlbum && <div className="gallery-album-view"><div className="album-topline"><button className="review-action" type="button" onClick={() => setSelectedAlbum(null)}>← All albums</button><span>{photos.length} moments</span></div><div className="album-title"><p className="kicker">Photo journal</p><h3>{selectedAlbum.title}</h3><p>{selectedAlbum.description || 'A collection of moments from XVK Scout Group.'}</p></div>{photosLoading && <p className="event-state">Loading photos...</p>}{photosError && <p className="event-state">Unable to load photos. Please try again.</p>}{!photosLoading && !photosError && photos.length === 0 && <p className="event-state">No public photos in this album yet.</p>}{!photosLoading && !photosError && photos.length > 0 && <div className="photo-grid">{photos.map((photo, index) => <button className={`photo-tile photo-tile-${index % 5}`} type="button" key={photo.id} onClick={() => setLightboxPhoto(photo)}><img src={galleryImageUrl(photo.image)} alt={photo.caption || selectedAlbum.title} /><span><strong>{photo.caption || 'A moment from XVK'}</strong>{photo.event_title && <small>{photo.event_title}</small>}</span></button>)}</div>}</div>}
    {lightboxPhoto && <div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={lightboxPhoto.caption || 'Gallery photo'} onClick={() => setLightboxPhoto(null)}><button className="lightbox-close" type="button" onClick={() => setLightboxPhoto(null)} aria-label="Close preview">×</button><div className="lightbox-content" onClick={(event) => event.stopPropagation()}><img src={galleryImageUrl(lightboxPhoto.image)} alt={lightboxPhoto.caption || selectedAlbum?.title || 'Gallery photo'} /><div><strong>{lightboxPhoto.caption || selectedAlbum?.title}</strong>{lightboxPhoto.event_title && <span>{lightboxPhoto.event_title}</span>}</div></div></div>}
  </section>
}
