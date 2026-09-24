import { useState, type FormEvent } from 'react'
import { createEvent, deleteEvent, updateEvent, type EventItem } from '../../api/eventApi'
import { WINGS } from '../../config/wings'
import { formatDate } from '../../utils/date'

const categories = [
  ['WEEKLY_MEETING', 'Weekly Meeting'], ['CAMP', 'Camp'], ['TREKKING', 'Trekking'],
  ['HIKING_ADVENTURE', 'Hiking / Adventure'], ['COMMUNITY_SERVICE', 'Community Service'],
  ['TRAINING', 'Training'], ['CELEBRATION', 'Celebration'], ['RALLY', 'Rally'],
  ['COMPETITION', 'Competition'], ['STATE_NATIONAL', 'State / National Event'],
  ['INTERNATIONAL', 'International Event'], ['OTHER', 'Other'],
]
const blank = { title: '', category: 'WEEKLY_MEETING', short_summary: '', description: '', location: '', address: '', maps_link: '', start_date: '', end_date: '', eligible_wings: ['ALL'], organizer: 'Kanteerava Open Scout Group', instructions: '', registration_link: '', registration_deadline: '', registration_details: '', contact_person: '', contact_phone: '', contact_email: '', contact_instructions: '', is_published: false }
type Draft = typeof blank
const localDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function EventAdminPanel({ events, onRefresh }: { events: EventItem[]; onRefresh: () => Promise<void> }) {
  const [draft, setDraft] = useState<Draft>(blank)
  const [editing, setEditing] = useState<EventItem | null>(null)
  const [poster, setPoster] = useState<File | null>(null)
  const [circular, setCircular] = useState<File | null>(null)
  const [message, setMessage] = useState('')
  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }))
  const reset = () => { setDraft(blank); setEditing(null); setPoster(null); setCircular(null) }
  const edit = (item: EventItem) => {
    setEditing(item)
    setDraft({ title: item.title, category: item.category || 'OTHER', short_summary: item.short_summary || '', description: item.description, location: item.location, address: item.address || '', maps_link: item.maps_link || '', start_date: localDate(item.start_date), end_date: localDate(item.end_date), eligible_wings: item.eligible_wings?.length ? item.eligible_wings : ['ALL'], organizer: item.organizer, instructions: item.instructions || '', registration_link: item.registration_link || '', registration_deadline: localDate(item.registration_deadline), registration_details: item.registration_details || '', contact_person: item.contact_person || '', contact_phone: item.contact_phone || '', contact_email: item.contact_email || '', contact_instructions: item.contact_instructions || '', is_published: Boolean(item.is_published) })
    window.setTimeout(() => document.getElementById('event-editor')?.scrollIntoView({ behavior: 'smooth' }), 0)
  }
  const toggleWing = (wing: string) => {
    if (wing === 'ALL') { change('eligible_wings', ['ALL']); return }
    const selected = draft.eligible_wings.filter((item) => item !== 'ALL')
    change('eligible_wings', selected.includes(wing) ? selected.filter((item) => item !== wing) : [...selected, wing])
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const data = new FormData()
    Object.entries(draft).forEach(([key, value]) => {
      if (key === 'eligible_wings') { const wings = value as string[]; data.append(key, JSON.stringify(wings.length ? wings : ['ALL'])) }
      else if (value !== '') data.append(key, String(value))
    })
    if (poster) data.append('poster', poster)
    if (circular) data.append('circular', circular)
    try {
      if (editing) await updateEvent(editing.id, data); else await createEvent(data)
      await onRefresh(); setMessage(editing ? 'Event updated.' : 'Event created.'); reset()
    } catch { setMessage('Unable to save the event. Check the dates, links, and uploaded files.') }
  }
  return <section className="admin-panel event-admin">
    <div className="panel-heading"><p className="kicker">Admin workspace</p><h2>Events</h2></div>
    <div className="review-list"><h3>Event records</h3>{!events.length && <p className="membership-copy">No events yet.</p>}{events.map((item) => <div className="review-row" key={item.id}><span><strong>{item.title}</strong><small>{item.is_published ? 'Published' : 'Draft'} / {formatDate(item.start_date)}</small></span><div className="review-actions"><button className="review-action" type="button" onClick={() => edit(item)}>Edit</button><button className="review-action" type="button" onClick={async () => { const data = new FormData(); data.append('is_published', String(!item.is_published)); await updateEvent(item.id, data); await onRefresh() }}>{item.is_published ? 'Unpublish' : 'Publish'}</button><button className="review-action danger" type="button" onClick={async () => { if (!window.confirm('Delete this event?')) return; await deleteEvent(item.id); await onRefresh() }}>Delete</button></div></div>)}</div>
    <form className="event-admin-form" id="event-editor" onSubmit={submit}>
      <div className="event-form-heading"><h3>{editing ? 'Edit Event' : 'Create Event'}</h3>{editing && <button className="review-action" type="button" onClick={reset}>Cancel edit</button>}</div>
      <label>Event title<input required value={draft.title} onChange={(e) => change('title', e.target.value)} /></label>
      <label>Category<select value={draft.category} onChange={(e) => change('category', e.target.value)}>{categories.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label className="wide-field">Short summary<input required maxLength={320} value={draft.short_summary} onChange={(e) => change('short_summary', e.target.value)} /></label>
      <label className="wide-field">Full description<textarea required value={draft.description} onChange={(e) => change('description', e.target.value)} /></label>
      <label>Start date and time<input required type="datetime-local" value={draft.start_date} onChange={(e) => change('start_date', e.target.value)} /></label>
      <label>End date and time (optional)<input type="datetime-local" value={draft.end_date} onChange={(e) => change('end_date', e.target.value)} /></label>
      <label>Venue/location<input required value={draft.location} onChange={(e) => change('location', e.target.value)} /></label>
      <label>Google Maps link<input type="url" value={draft.maps_link} onChange={(e) => change('maps_link', e.target.value)} /></label>
      <label className="wide-field">Address/details<textarea value={draft.address} onChange={(e) => change('address', e.target.value)} /></label>
      <fieldset className="event-wing-picker wide-field"><legend>Eligible wings</legend><label><input type="checkbox" checked={draft.eligible_wings.includes('ALL')} onChange={() => toggleWing('ALL')} />All Wings</label>{WINGS.map((wing) => <label data-wing={wing.type} key={wing.type}><input type="checkbox" checked={draft.eligible_wings.includes(wing.type)} onChange={() => toggleWing(wing.type)} />{wing.label}</label>)}</fieldset>
      <label>Organizer<input required value={draft.organizer} onChange={(e) => change('organizer', e.target.value)} /></label>
      <label>Poster / cover image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPoster(e.target.files?.[0] || null)} /></label>
      <label>Official circular (PDF)<input type="file" accept="application/pdf" onChange={(e) => setCircular(e.target.files?.[0] || null)} /></label>
      <label className="wide-field">Detailed instructions<textarea value={draft.instructions} onChange={(e) => change('instructions', e.target.value)} /></label>
      <label>Registration link<input type="url" value={draft.registration_link} onChange={(e) => change('registration_link', e.target.value)} /></label>
      <label>Registration deadline<input type="datetime-local" value={draft.registration_deadline} onChange={(e) => change('registration_deadline', e.target.value)} /></label>
      <label className="wide-field">Registration instructions/details<textarea value={draft.registration_details} onChange={(e) => change('registration_details', e.target.value)} /></label>
      <label>Contact person<input value={draft.contact_person} onChange={(e) => change('contact_person', e.target.value)} /></label>
      <label>Contact phone<input value={draft.contact_phone} onChange={(e) => change('contact_phone', e.target.value)} /></label>
      <label>Contact email<input type="email" value={draft.contact_email} onChange={(e) => change('contact_email', e.target.value)} /></label>
      <label>Additional contact instructions<input value={draft.contact_instructions} onChange={(e) => change('contact_instructions', e.target.value)} /></label>
      <label className="event-publish wide-field"><input type="checkbox" checked={draft.is_published} onChange={(e) => change('is_published', e.target.checked)} /> Publish event</label>
      <button className="submit wide-field" type="submit">{editing ? 'Save Event' : 'Create Event'}</button>
    </form>{message && <p className="form-message">{message}</p>}
  </section>
}
