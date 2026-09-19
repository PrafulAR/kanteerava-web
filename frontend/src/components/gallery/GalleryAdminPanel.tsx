import { useState } from 'react'
import type { FormEvent } from 'react'
import { createGalleryAlbum, deleteGalleryAlbum, deleteGalleryPhoto, galleryImageUrl, getGalleryPhotos, updateGalleryAlbum, updateGalleryPhoto, uploadGalleryPhoto, type GalleryAlbum, type GalleryPhoto } from '../../api/galleryApi'
import type { EventItem } from '../../api/eventApi'

interface GalleryAdminPanelProps {
  albums: GalleryAlbum[]
  events: EventItem[]
  onRefreshAlbums: () => Promise<void>
}

export function GalleryAdminPanel({ albums, events, onRefreshAlbums }: GalleryAdminPanelProps) {
  const [selected, setSelected] = useState<GalleryAlbum | null>(null)
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [published, setPublished] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [eventId, setEventId] = useState('')
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [editEventId, setEditEventId] = useState('')
  const [editPublished, setEditPublished] = useState(false)
  const [message, setMessage] = useState('')

  const selectAlbum = (album: GalleryAlbum) => {
    setSelected(album)
    setTitle(album.title)
    setDescription(album.description)
    setPublished(album.is_published)
    getGalleryPhotos(album.id).then((response) => setPhotos(response.data.data)).catch(() => setMessage('Unable to load this album’s photos.'))
  }

  const refreshPhotos = async () => {
    if (!selected) return
    const response = await getGalleryPhotos(selected.id)
    setPhotos(response.data.data)
  }

  const createAlbum = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const response = await createGalleryAlbum({ title, description, is_published: published })
      setSelected(response.data.data)
      setMessage('Album created. You can upload photos below.')
      await onRefreshAlbums()
    } catch { setMessage('Unable to create the album. Check the title and try again.') }
  }

  const saveAlbum = async () => {
    if (!selected) return
    try {
      const response = await updateGalleryAlbum(selected.id, { title, description, is_published: published })
      setSelected(response.data.data)
      setMessage('Album saved.')
      await onRefreshAlbums()
    } catch { setMessage('Unable to save this album.') }
  }

  const uploadPhoto = async (event: FormEvent) => {
    event.preventDefault()
    if (!selected || !file) { setMessage('Choose an image before uploading.'); return }
    const payload = new FormData()
    payload.append('image', file)
    payload.append('caption', caption)
    if (eventId) payload.append('event', eventId)
    try {
      await uploadGalleryPhoto(selected.id, payload)
      setFile(null); setCaption(''); setEventId('')
      setMessage('Photo uploaded.')
      await refreshPhotos()
      await onRefreshAlbums()
    } catch { setMessage('Unable to upload the photo. Use a JPEG, PNG, or WebP image no larger than 5 MB.') }
  }

  return <section className="admin-panel gallery-admin" id="gallery-admin"><div className="panel-heading"><p className="kicker">Admin workspace</p><h2>Gallery</h2></div><div className="review-list"><h3>Albums</h3>{albums.length === 0 && <p className="membership-copy">Create the first gallery album.</p>}{albums.map((album) => <div className="review-row" key={album.id}><span><strong>{album.title}</strong><small>{album.is_published ? 'Published' : 'Private'} / {album.photo_count} photos</small></span><div className="review-actions"><button className="review-action" type="button" onClick={async () => { try { await updateGalleryAlbum(album.id, { is_published: !album.is_published }); await onRefreshAlbums(); setMessage(`Album ${album.is_published ? 'unpublished' : 'published'}.`) } catch { setMessage('Unable to update album visibility.') } }}>{album.is_published ? 'Unpublish' : 'Publish'}</button><button className="review-action" type="button" onClick={() => selectAlbum(album)}>Manage</button></div></div>)}</div><form className="gallery-form" onSubmit={createAlbum}><input required placeholder="Album title" value={title} onChange={(event) => setTitle(event.target.value)} /><textarea placeholder="Album description" value={description} onChange={(event) => setDescription(event.target.value)} /><label><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publish album</label><button className="submit" type="submit">Create album</button></form>{selected && <div className="application-review"><div className="review-header"><h3>{selected.title}</h3><button className="review-close" type="button" onClick={() => setSelected(null)}>Close</button></div><div className="review-fields"><label>Album title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Visibility<select value={published ? 'published' : 'private'} onChange={(event) => setPublished(event.target.value === 'published')}><option value="private">Private</option><option value="published">Published</option></select></label><label className="wide-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><div className="review-actions"><button className="review-action" type="button" onClick={saveAlbum}>Save album</button><button className="review-action danger" type="button" onClick={async () => { if (!window.confirm('Delete this album and all its photos?')) return; try { await deleteGalleryAlbum(selected.id); setSelected(null); setPhotos([]); await onRefreshAlbums(); setMessage('Album deleted.') } catch { setMessage('Unable to delete this album.') } }}>Delete album</button></div><form className="gallery-form" onSubmit={uploadPhoto}><h3>Upload photo</h3><input required type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><input placeholder="Caption (optional)" value={caption} onChange={(event) => setCaption(event.target.value)} /><select value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">No event association</option>{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><small className="upload-note">Photos are published automatically when uploaded.</small><button className="submit" type="submit">Upload photo</button></form><div className="admin-photo-list">{photos.map((photo) => <div key={photo.id}><img src={galleryImageUrl(photo.image)} alt="" /><span><strong>{photo.caption || 'Untitled photo'}</strong><small>{photo.is_published ? 'Published' : 'Private'}{photo.event_title ? ` / ${photo.event_title}` : ''}</small></span><button className="review-action" type="button" onClick={() => { setEditingPhoto(photo); setEditCaption(photo.caption); setEditEventId(photo.event ?? ''); setEditPublished(photo.is_published) }}>Edit</button><button className="review-action danger" type="button" onClick={async () => { if (!window.confirm('Delete this photo?')) return; try { await deleteGalleryPhoto(photo.id); await refreshPhotos(); await onRefreshAlbums() } catch { setMessage('Unable to delete this photo.') } }}>Delete</button></div>)}</div>{editingPhoto && <form className="gallery-form" onSubmit={async (event) => { event.preventDefault(); try { await updateGalleryPhoto(editingPhoto.id, { caption: editCaption, event: editEventId || null, is_published: editPublished }); setEditingPhoto(null); await refreshPhotos(); await onRefreshAlbums(); setMessage('Photo details saved.') } catch { setMessage('Unable to save photo details.') } }}><h3>Edit photo</h3><input placeholder="Caption (optional)" value={editCaption} onChange={(event) => setEditCaption(event.target.value)} /><select value={editEventId} onChange={(event) => setEditEventId(event.target.value)}><option value="">No event association</option>{events.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select><label><input type="checkbox" checked={editPublished} onChange={(event) => setEditPublished(event.target.checked)} /> Publish photo</label><button className="submit" type="submit">Save photo details</button></form>}</div>}{message && <p className="form-message">{message}</p>}</section>
}
