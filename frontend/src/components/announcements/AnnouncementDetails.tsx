import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnnouncement, newsroomFileUrl, type AnnouncementItem } from '../../api/announcementApi'
import { wingLabel } from '../../config/wings'

export function AnnouncementDetails({ id }: { id: string }) {
  const [post, setPost] = useState<AnnouncementItem | null>(null); const [error, setError] = useState(false)
  useEffect(() => { getAnnouncement(id).then((response) => setPost(response.data.data)).catch(() => setError(true)) }, [id])
  if (error) return <section className="news-detail page-section"><p>Unable to load this Newsroom post.</p><Link to="/announcements">← Back to Newsroom</Link></section>
  if (!post) return <section className="news-detail page-section"><p>Loading post...</p></section>
  return <article className="news-detail page-section"><Link className="news-back" to="/announcements">← Back to Newsroom</Link><header><p className="kicker">{post.category.replaceAll('_',' ')}</p><h1>{post.title}</h1><div className="news-detail-meta"><time>{new Date(post.publish_date || post.created_at).toLocaleDateString(undefined, { day:'numeric', month:'long', year:'numeric' })}</time>{post.author_name && <span>· By {post.author_name}</span>}{post.is_pinned && <span>· Pinned</span>}</div>{post.target_wings?.length > 0 && <div className="news-wings">{post.target_wings.map((wing) => <span data-wing={wing} key={wing}>{wing === 'ALL' ? 'Everyone' : wingLabel(wing)}</span>)}</div>}</header>{post.cover_image && <img className="news-detail-cover" src={newsroomFileUrl(post.cover_image)} alt={post.title} />}<div className="news-article">{post.content.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>{post.attachment && <section className="news-attachment"><p className="kicker">Attachment</p><div><a href={newsroomFileUrl(post.attachment)} target="_blank" rel="noopener noreferrer">View Attachment</a><a href={newsroomFileUrl(post.attachment)} download>Download PDF</a></div></section>}</article>
}
