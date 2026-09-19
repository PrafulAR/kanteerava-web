import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { newsroomFileUrl, type AnnouncementItem } from '../../api/announcementApi'
import { wingLabel } from '../../config/wings'

type Filter = 'ALL' | 'NOTICE' | 'STORY' | 'REPORT'
const categoryLabel = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
const isReport = (post: AnnouncementItem) => post.category.endsWith('_REPORT')

function NewsCard({ post, featured = false }: { post: AnnouncementItem; featured?: boolean }) {
  return <Link className={`news-card${featured ? ' news-card-featured' : ''} news-card-${post.content_type.toLowerCase()}`} to={`/announcements/${post.id}`} aria-label={`Read ${post.title}`}>
    {post.cover_image && <img src={newsroomFileUrl(post.cover_image)} alt="" />}
    <div className="news-card-body"><div className="news-card-meta"><span>{categoryLabel(post.category)}</span>{post.is_pinned && <b>Pinned</b>}</div><h2>{post.title}</h2><p>{post.summary || post.content}</p><div className="news-card-footer"><time dateTime={post.publish_date}>{new Date(post.publish_date || post.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</time><strong>Read More →</strong></div>{post.target_wings?.length > 0 && <div className="news-wings">{post.target_wings.map((wing) => <span data-wing={wing} key={wing}>{wing === 'ALL' ? 'Everyone' : wingLabel(wing)}</span>)}</div>}</div>
  </Link>
}

export function AnnouncementFeed({ announcements, loading, error }: { announcements: AnnouncementItem[]; loading: boolean; error: boolean }) {
  const [filter, setFilter] = useState<Filter>('ALL'); const [search, setSearch] = useState('')
  const visible = useMemo(() => announcements.filter((post) => { const kind = filter === 'ALL' || (filter === 'REPORT' ? isReport(post) : post.content_type === filter); const term = search.trim().toLowerCase(); return kind && (!term || `${post.title} ${post.summary} ${post.content} ${post.category}`.toLowerCase().includes(term)) }), [announcements, filter, search])
  const featured = visible.filter((post) => post.is_pinned).slice(0, 2); const regular = visible.filter((post) => !featured.some((item) => item.id === post.id))
  return <section className="newsroom page-section"><header className="newsroom-heading"><p className="kicker">Newsroom</p><h1>Stories from around<br/><em>the campfire.</em></h1><p>News, notices, reports and stories from life at Kanteerava.</p></header><div className="newsroom-tools"><div className="news-filters" aria-label="Filter Newsroom posts">{(['ALL','NOTICE','STORY','REPORT'] as Filter[]).map((item) => <button className={filter === item ? 'active' : ''} type="button" onClick={() => setFilter(item)} key={item}>{item === 'ALL' ? 'All' : item === 'NOTICE' ? 'Notices' : item === 'STORY' ? 'Stories' : 'Reports'}</button>)}</div><label className="news-search"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the Newsroom..." /></label></div>
    {loading && <p className="event-state">Loading the Newsroom...</p>}{error && <p className="event-state">Unable to load the Newsroom.</p>}{!loading && !error && !visible.length && <p className="event-state">No posts match this view.</p>}
    {!!featured.length && <div className="featured-news"><p className="kicker">Pinned from the group</p><div>{featured.map((post) => <NewsCard post={post} featured key={post.id} />)}</div></div>}<div className="news-grid">{regular.map((post) => <NewsCard post={post} key={post.id} />)}</div>
  </section>
}
