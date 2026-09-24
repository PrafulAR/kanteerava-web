import { SOCIAL_LINKS } from '../../config/socialLinks'

function SocialMark({ type }: { type: keyof typeof SOCIAL_LINKS }) {
  if (type === 'instagram') return <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="10" width="44" height="44" rx="13"/><circle cx="32" cy="32" r="11"/><circle className="mark-accent" cx="47" cy="18" r="2.5"/></svg>
  if (type === 'facebook') return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M38 55V35h8l2-10H38v-5c0-4 2-6 7-6h4V5c-2-1-6-1-9-1-10 0-16 6-16 16v5h-9v10h9v20"/></svg>
  if (type === 'maps') return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 58S12 40 12 24C12 13 21 5 32 5s20 8 20 19c0 16-20 34-20 34Z"/><circle cx="32" cy="24" r="8"/><path className="mark-accent" d="M18 54c8-4 20-4 28 0"/></svg>
  return <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M55 32c0-2-.2-4-.6-6H32v11h13c-2 7-7 12-15 12-10 0-18-8-18-18s8-18 18-18c5 0 9 2 12 5l8-8C45 5 38 2 30 2 14 2 2 15 2 31s12 29 28 29c17 0 26-12 26-27l-1-1Z"/><path className="mark-accent" d="M7 17c4-8 13-14 23-14"/></svg>
}

const cards = [
  { type: 'instagram', label: 'Instagram', title: 'Follow us on Instagram', copy: 'Camps, adventures, memories, and everyday moments from Kanteerava.', cta: 'Visit Instagram ↗', primary: true },
  { type: 'facebook', label: 'Facebook', title: 'Connect with us on Facebook', copy: 'Follow updates, events, milestones, and stories from the Kanteerava community.', cta: 'Visit Facebook ↗', primary: true },
  { type: 'google', label: 'Google', title: 'Find Kanteerava on Google', copy: 'View our presence, information, and updates on Google.', cta: 'View on Google ↗', primary: false },
  { type: 'maps', label: 'Google Maps', title: 'Find us on Google Maps', copy: 'Get directions and find your way to Kanteerava.', cta: 'Get Directions ↗', primary: false },
] as const

export function SocialConnect() {
  return <section className="social-connect" aria-labelledby="social-connect-heading">
    <div className="social-connect-heading"><p className="kicker">Stay connected</p><h2 id="social-connect-heading">Find us beyond<br/><em>the campfire.</em></h2><p>Follow our journey, revisit our stories, and find your way to Kanteerava.</p></div>
    <div className="social-card-grid">
      {cards.map((card) => <a className={`social-card ${card.primary ? 'social-card-primary' : 'social-card-secondary'} social-${card.type}`} href={SOCIAL_LINKS[card.type]} target="_blank" rel="noopener noreferrer" key={card.type}>
        <div className="social-mark"><SocialMark type={card.type}/></div>
        <div className="social-card-copy"><span>{card.label}</span><h3>{card.title}</h3><p>{card.copy}</p><strong>{card.cta}</strong></div>
      </a>)}
    </div>
  </section>
}
