import { useState, type FormEvent } from 'react'
import { achievementImageUrl, createAchievement, deleteAchievement, updateAchievement, type AchievementItem } from '../../api/achievementApi'
import { formatDate, todayInputValue } from '../../utils/date'

const validationMessage = (error: unknown, fallback: string) => {
  const data = (error as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== 'object') return fallback
  const fieldError = Object.entries(data as Record<string, unknown>).find(([, value]) => Array.isArray(value) || typeof value === 'string')
  if (!fieldError) return fallback
  const [field, value] = fieldError; const detail = Array.isArray(value) ? value[0] : value
  if (typeof detail !== 'string') return fallback
  const labels: Record<string, string> = { achievement_date: 'Achievement date', image: 'Achievement photo' }
  return `${labels[field] ?? field}: ${detail}`
}

export function AchievementAdminPanel({ items, onRefresh }: { items: AchievementItem[]; onRefresh: () => Promise<void> }) {
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [date, setDate] = useState('')
  const [category, setCategory] = useState(''); const [recipient, setRecipient] = useState(''); const [image, setImage] = useState<File | null>(null)
  const [published, setPublished] = useState(false); const [message, setMessage] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); const payload = new FormData(); payload.append('title', title); payload.append('description', description); payload.append('achievement_date', date); payload.append('category', category); payload.append('recipient', recipient); payload.append('is_published', String(published)); if (image) payload.append('image', image); try { await createAchievement(payload); setTitle(''); setDescription(''); setDate(''); setCategory(''); setRecipient(''); setImage(null); setPublished(false); setMessage('Achievement created.'); await onRefresh() } catch (error) { setMessage(validationMessage(error, 'Unable to create achievement. Please check the details and try again.')) } }
  const addPhoto = async (item: AchievementItem, file: File | null) => { if (!file) return; const payload = new FormData(); payload.append('image', file); try { await updateAchievement(item.id, payload); await onRefresh(); setMessage(`Photo ${item.image ? 'replaced' : 'added'} for ${item.title}.`) } catch (error) { setMessage(validationMessage(error, 'Unable to add the photo. Please try again.')) } }

  return <section className="admin-panel achievement-admin"><div className="panel-heading"><p className="kicker">Admin workspace</p><h2>Achievements</h2></div>
    <form className="gallery-form" onSubmit={submit}><input required placeholder="Achievement title" value={title} onChange={(event) => setTitle(event.target.value)} /><input required type="date" max={todayInputValue()} value={date} onChange={(event) => setDate(event.target.value)} /><input placeholder="Category (optional)" value={category} onChange={(event) => setCategory(event.target.value)} /><input placeholder="Recipient (optional)" value={recipient} onChange={(event) => setRecipient(event.target.value)} /><label className="wide-field achievement-image-field">Achievement photo <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] ?? null)} /><small>Optional. JPEG, PNG, or WebP up to 5 MB.</small></label><textarea required placeholder="What did the group achieve?" value={description} onChange={(event) => setDescription(event.target.value)} /><label><input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} /> Publish immediately</label><button className="submit" type="submit">Add achievement</button></form>
    <div className="review-list"><h3>Achievement records</h3>{!items.length && <p className="membership-copy">No achievements yet.</p>}{items.map((item) => <div className="review-row achievement-record" key={item.id}>{item.image && <img className="achievement-admin-thumb" src={achievementImageUrl(item.image)} alt="" />}<span><strong>{item.title}</strong><small>{item.is_published ? 'Published' : 'Private'} / {formatDate(item.achievement_date)}{item.image ? ' / Photo added' : ''}</small></span><div className="review-actions"><label className="review-action achievement-photo-action">{item.image ? 'Replace photo' : 'Add photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void addPhoto(item, event.target.files?.[0] ?? null); event.currentTarget.value = '' }} /></label><button className="review-action" type="button" onClick={async () => { try { await updateAchievement(item.id, { is_published: !item.is_published }); await onRefresh(); setMessage(`Achievement ${item.is_published ? 'unpublished' : 'published'}.`) } catch { setMessage('Unable to update visibility.') } }}>{item.is_published ? 'Unpublish' : 'Publish'}</button><button className="review-action danger" type="button" onClick={async () => { if (!window.confirm('Delete this achievement?')) return; try { await deleteAchievement(item.id); await onRefresh(); setMessage('Achievement deleted.') } catch { setMessage('Unable to delete achievement.') } }}>Delete</button></div></div>)}</div>
    {message && <p className="form-message">{message}</p>}
  </section>
}
