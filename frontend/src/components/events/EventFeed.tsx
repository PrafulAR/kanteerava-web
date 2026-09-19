import { Link } from 'react-router-dom'
import { eventFileUrl, type EventItem } from '../../api/eventApi'
import { wingLabel } from '../../config/wings'
import type { MemberType } from '../../api/membershipApi'

interface EventFeedProps {
  events: EventItem[]
  loading: boolean
  error: boolean
}

const finishedAt = (event: EventItem) => new Date(event.end_date || event.start_date)
function EventCard({ event, past }: { event: EventItem; past: boolean }) { const wings = event.eligible_wings?.length ? event.eligible_wings : ['ALL']; return <Link className={`event-preview${past ? ' event-preview-past' : ''}`} to={`/events/${event.id}`} aria-label={`View details for ${event.title}`}>{(event.poster || event.event_image) && <img src={eventFileUrl(event.poster || event.event_image)} alt="" />}<div className="event-preview-body"><div className="event-preview-meta"><span>{(event.category || 'Event').replaceAll('_', ' ')}</span>{past && <span>Event completed</span>}</div><h3>{event.title}</h3><p className="event-when">{new Date(event.start_date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })} · {new Date(event.start_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p><p className="event-place">{event.location}</p><div className="event-wings">{wings.map((wing) => <span data-wing={wing} key={wing}>{wing === 'ALL' ? 'All Wings' : wingLabel(wing as MemberType)}</span>)}</div><p className="event-summary">{event.short_summary || event.description}</p><strong className="event-view">View Details →</strong></div></Link> }

export function EventFeed({ events, loading, error }: EventFeedProps) { const now = new Date(); const published = events.filter((event) => event.is_published !== false); const upcoming = published.filter((event) => finishedAt(event) >= now); const past = published.filter((event) => finishedAt(event) < now).reverse(); return <section className="events-page page-section" id="events"><header className="events-page-heading"><p className="kicker">Upcoming</p><h1>Where we're<br/><em>headed next.</em></h1><p>Meetings, camps, service, training, and adventures from XV Kanteerava.</p></header>{loading && <p className="event-state">Loading events...</p>}{error && <p className="event-state">Unable to load events. Please try again.</p>}{!loading && !error && <><div className="event-preview-grid">{upcoming.map((event) => <EventCard event={event} past={false} key={event.id} />)}</div>{!upcoming.length && <p className="event-empty">No upcoming events have been published yet.</p>}<div className="past-events-heading"><p className="kicker">Past events</p><h2>Stories we've<br/><em>already lived.</em></h2></div><div className="event-preview-grid event-past-grid">{past.map((event) => <EventCard event={event} past key={event.id} />)}</div>{!past.length && <p className="event-empty">Past events will appear here.</p>}</>}</section> }
