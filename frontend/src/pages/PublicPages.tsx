import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import weeklyMeetingsArt from '../assets/activity-weekly-meetings.webp'
import campsArt from '../assets/activity-camps-trekking.webp'
import hikingArt from '../assets/activity-hiking-adventure.webp'
import serviceArt from '../assets/activity-community-service.webp'
import environmentArt from '../assets/activity-environmental-awareness.webp'
import skillsArt from '../assets/activity-skill-development.webp'
import leadershipArt from '../assets/activity-leadership-training.webp'
import internationalArt from '../assets/activity-international-events.webp'
import bsgLogo from '../assets/BSG-Logo.png'
import wosmLogo from '../assets/wosm-logo.png'
import rashtrapatiMain from '../assets/Untitled Design (2).png'
import rashtrapatiSecond from '../assets/Untitled Design (3).png'
import rashtrapatiThird from '../assets/Untitled Design (4).png'
import { HistoricalPhotoCarousel } from '../components/about/HistoricalPhotoCarousel'
import { historicalPhotos } from '../components/about/historicalPhotos'
import { ScoutingJourney } from '../components/public/ScoutingJourney'
import { SOCIAL_LINKS } from '../config/socialLinks'

type ActivityKey = 'meeting' | 'camp' | 'hike' | 'service' | 'nature' | 'skills' | 'leadership' | 'world'
const activities: { title: string; key: ActivityKey; image: string; alt: string }[] = [
  { title: 'Weekly Scout Meetings', key: 'meeting', image: weeklyMeetingsArt, alt: 'Three Scouts gathered beside a flag' },
  { title: 'Camps and Trekking', key: 'camp', image: campsArt, alt: 'Tent, campfire and pine tree' },
  { title: 'Hiking and Adventure', key: 'hike', image: hikingArt, alt: 'Mountain trail, backpack and walking stick' },
  { title: 'Community Service', key: 'service', image: serviceArt, alt: 'Helping hands supporting a young sapling' },
  { title: 'Environmental Awareness', key: 'nature', image: environmentArt, alt: 'Young sapling growing from the earth' },
  { title: 'Skill Development', key: 'skills', image: skillsArt, alt: 'Scout reef knot and rope coil' },
  { title: 'Leadership Training', key: 'leadership', image: leadershipArt, alt: 'Scout leading the way towards a flag' },
  { title: 'National and International Events', key: 'world', image: internationalArt, alt: 'Globe with travel route and destination flags' },
]

const familyBranches = [
  { label: 'Scout Group', name: 'Kanteerava Open Scout Group', units: [
    { name: 'Kanteerava Cub Pack', wing: 'CUB', age: '5–10 years' },
    { name: 'XV Kanteerava Scout Troop', wing: 'SCOUT', age: '11–16 years' },
    { name: 'Kanteerava Rover Crew', wing: 'ROVER', age: '17–25 years' },
  ] },
  { label: 'Guide Group', name: 'Kanteerava Open Guide Group', units: [
    { name: 'Kanteerava Bulbul Flock', wing: 'BULBUL', age: '5–10 years' },
    { name: 'Kanteerava Guide Company', wing: 'GUIDE', age: '11–16 years' },
    { name: 'Kanteerava Ranger Team', wing: 'RANGER', age: '17–25 years' },
  ] },
]

const rashtrapatiAwardImages = [
  { src: rashtrapatiMain, alt: 'A Kanteerava member receiving a Rashtrapati Award from the President of India' },
  { src: rashtrapatiSecond, alt: 'A young Kanteerava Scout receiving a Rashtrapati Award from the President of India' },
  { src: rashtrapatiThird, alt: 'Kanteerava Scouts and Guides gathered at a Rashtrapati Award ceremony' },
] as const

const informationTerms = {
  badenPowell: 'Robert Baden-Powell was the founder of the Scout Movement and a British Army officer. His ideas about outdoor learning, responsibility, leadership and character development helped shape modern Scouting.',
  experimentalCamp: 'Baden-Powell organised an experimental camp in 1907 to test ways of educating young people through camping, teamwork, patrols, outdoor skills and responsibility. It became an important milestone in the development of Scouting.',
  wosm: 'World Organization of the Scout Movement. WOSM is the principal international organization for the Scout Movement and connects National Scout Organizations around the world.',
  wagggs: 'World Association of Girl Guides and Girl Scouts. WAGGGS is the global organization supporting Girl Guiding and Girl Scouting and connects Member Organizations internationally.',
} as const

function InfoTerm({ children, description }: { children: ReactNode; description: string }) {
  const popoverId = useId()
  const containerRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const isOpen = hovered || focused || pinned

  useEffect(() => {
    if (!isOpen) return
    const closeOutside = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return
      setHovered(false); setFocused(false); setPinned(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setHovered(false); setFocused(false); setPinned(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return <span className="info-term-wrap" ref={containerRef} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
    <button ref={triggerRef} className="info-term" type="button" aria-expanded={isOpen} aria-controls={popoverId} onFocus={() => setFocused(true)} onBlur={() => { if (!pinned) setFocused(false) }} onClick={() => { if (window.matchMedia('(hover: none), (pointer: coarse)').matches) setPinned((current) => !current) }}>{children}</button>
    {isOpen && <span className="info-popover" id={popoverId} role="tooltip">{description}</span>}
  </span>
}

export function AboutPage() {
  return <>
    <section className="page-intro"><p className="kicker">Who we are</p><h1>A legacy of<br/><em>service since 1946.</em></h1><p>Kanteerava is one of Karnataka&apos;s enduring Scouting and Guiding communities.</p></section>
    <HistoricalPhotoCarousel photos={historicalPhotos}/>
    <section className="identity-story page-section">
      <div className="identity-story-heading"><p className="kicker">Our story</p><h2>Generations shaped<br/>by <em>purpose.</em></h2></div>
      <div className="identity-copy"><p><strong>XV Kanteerava Scout Troop</strong> has been a proud part of the Scouting movement since <strong>1946</strong>. Founded by Scout Masters Mr. Sriram , Mr. D S Siddaiah and Mr. Ananthaiah, the group has grown through generations while carrying forward the values, traditions, and spirit of Scouting.</p><p>Over the years, Kanteerava has grown into a strong and active Scouting and Guiding community through the dedication of our leaders and members. We believe in developing discipline, leadership, teamwork, service, and responsibility among young people.</p></div>
      <aside className="why-xv"><div className="why-xv-mark" aria-hidden="true"><span>X</span><span>V</span></div><div><p className="kicker">A number with a story</p><h3>Why XV?</h3><p>The “XV” in our name is the Roman numeral for 15. Kanteerava became the 15th Chartered Scouting Unit in the Mysore Province, and that number has remained a proud part of our identity and heritage ever since.</p></div></aside>
    </section>
    <section className="movement-story page-section"><div className="organisation-story-heading"><p className="kicker">The Scouting Movement</p><figure className="organisation-mark organisation-mark-wosm"><img src={wosmLogo} alt="World Organization of the Scout Movement emblem"/></figure><h2>A worldwide movement.<br/><em>A shared purpose.</em></h2></div><div><p>Founded by <InfoTerm description={informationTerms.badenPowell}>Lord Robert Baden-Powell</InfoTerm> after the <InfoTerm description={informationTerms.experimentalCamp}>experimental camp</InfoTerm> on Brownsea Island in 1907, Scouting grew into a worldwide youth movement.</p><p>Through learning by doing, outdoor experiences, teamwork, leadership, responsibility and service, it helps young people develop character and skills for life. WOSM brings together 176 National Scout Organizations worldwide.</p></div></section>
    <section className="bsg-story page-section"><div className="organisation-story-heading"><p className="kicker">Our National Scout Organisation</p><figure className="organisation-mark organisation-mark-bsg"><img src={bsgLogo} alt="The Bharat Scouts and Guides emblem"/></figure><h2>The Bharat<br/><em>Scouts and Guides</em></h2></div><div><p>The Bharat Scouts and Guides (BSG) is India&apos;s national voluntary, non-political educational movement for young people, bringing Scouting and Guiding together across the country.</p><p><InfoTerm description={informationTerms.wosm}>WOSM</InfoTerm> is the World Organization of the Scout Movement, while <InfoTerm description={informationTerms.wagggs}>WAGGGS</InfoTerm> is the World Association of Girl Guides and Girl Scouts. They are distinct global organizations for Scouting and Guiding. Through BSG, Kanteerava belongs to this wider national and international family.</p></div></section>
    <section className="vision-mission page-section" aria-labelledby="vision-mission-title">
      <p className="kicker">Our Vision &amp; Mission</p>
      <h2 className="sr-only" id="vision-mission-title">Our Vision and Mission</h2>
      <div className="vision-mission-composition">
        <article className="vision-statement">
          <div className="vision-mission-label"><span>01</span><strong>Our Vision</strong></div>
          <h3>Growing through <em>Scouting.</em></h3>
          <p>To nurture a welcoming and active Kanteerava community where young people grow with confidence, character and responsibility, carrying the values of Scouting into their communities and the future.</p>
        </article>
        <span className="vision-mission-diagonal" aria-hidden="true"/>
        <article className="mission-statement">
          <div className="vision-mission-label"><span>02</span><strong>Our Mission</strong></div>
          <h3>Learning, leading and<br/><em>serving together.</em></h3>
          <p>To create meaningful Scouting and Guiding experiences through adventure, learning by doing, teamwork, leadership and service—supported by committed leaders and a strong sense of belonging.</p>
        </article>
      </div>
    </section>
    <section className="kanteerava-family page-section" aria-labelledby="family-heading">
      <div className="family-heading"><p className="kicker">Our Kanteerava Family</p><h2 id="family-heading">Many paths.<br/><em>One family.</em></h2><p>Six wings, one Kanteerava family—growing together through every stage of Scouting and Guiding.</p></div>
      <div className="family-tree">
        <div className="family-root" tabIndex={0}><span className="family-root-label">Kanteerava Family</span><strong>Kanteerava Open Scouts and Guides Group</strong><span className="family-root-mark" aria-hidden="true">&#9884;</span></div>
        <div className="family-branches">{familyBranches.map((branch) => <section className="family-branch" key={branch.name}><div className="family-group" tabIndex={0}><span>{branch.label}</span><strong>{branch.name}</strong></div><div className="family-units">{branch.units.map((unit) => <div className="family-unit" data-wing={unit.wing} tabIndex={0} key={unit.name}><strong>{unit.name}</strong><small>{unit.age}</small><span className="family-unit-marker" aria-hidden="true"/></div>)}</div></section>)}</div>
      </div>
    </section>
    <p className="identity-closing page-section">With a proud history spanning generations, Kanteerava continues to follow the true spirit of Scouting and Guiding while helping young people become responsible and confident citizens.</p>
  </>
}

export function ProgrammesPage() {
  return <><section className="page-intro page-blue"><p className="kicker">What we do</p><h1>Learn by doing.<br/><em>Grow through adventure.</em></h1><p>At Kanteerava, every activity builds practical skills, confidence, friendship, and a lifelong commitment to service.</p></section><section className="programme-story page-section"><div className="programme-story-intro"><p className="kicker">Skills for life</p><h2>Every experience<br/>has a <em>purpose.</em></h2><p>At Kanteerava, Scouting is about <strong>learning by doing, serving the community, exploring the outdoors, and building skills for life</strong>.</p></div><div className="activity-list">{activities.map((activity, index) => <article className={`activity-card activity-card-${activity.key}`} key={activity.title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{activity.title}</strong><img className="activity-art" src={activity.image} width="720" height="480" loading="lazy" alt={activity.alt}/></article>)}</div><div className="programme-narrative"><p>Our Cubs, Bulbuls, Scouts, Guides, Rovers, and Rangers take part in experiences that challenge them to work together, lead responsibly, and serve the world around them.</p><p>Our members have represented Kanteerava at State and National camps, as well as international events and Jamborees in <strong>Bangladesh, Japan, Malaysia, Nepal, Philippines, Portugal, Sri Lanka, South Korea and USA</strong>.</p><p>Through every camp, activity, adventure, and service project, we create memorable experiences while preparing young people to make a positive difference in society.</p></div><blockquote><span><b>Our</b> motto</span><strong>Scouting... Our Lifeline.</strong></blockquote></section></>
}

const involvementSocials = [
  ['Instagram', SOCIAL_LINKS.instagram], ['Facebook', SOCIAL_LINKS.facebook], ['Google', SOCIAL_LINKS.google], ['Google Maps', SOCIAL_LINKS.maps],
] as const

const scoutingExperiences = ['Camp under the stars', 'Go trekking and hiking', 'Learn practical skills', 'Make new friends', 'Work as a team', 'Serve your community', 'Take on challenges', 'Grow into a leader']

export function ContactPage() {
  const location = useLocation()
  useEffect(() => {
    if (location.hash !== '#scouting-journey') return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('scouting-journey')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  return <>
    <section className="involve-hero"><p className="kicker">Get involved</p><h1>There&apos;s a place for every<br/><em>young adventurer.</em></h1><p>Scouting is about more than uniforms and camps. It&apos;s about making friends, trying new things, exploring the outdoors, learning skills for life and growing into someone who can make a difference.</p><p className="involve-hero-note">At Kanteerava, there&apos;s a place for every young adventurer.</p><Link className="involve-primary" to="/join">Join the Group →</Link></section>
    <section className="involve-experiences page-section"><div className="involve-experiences-heading"><p className="kicker">More than just a weekly meeting</p><h2>Experience it<br/><em>for yourself.</em></h2><p>Scouting gives young people experiences that are difficult to learn from a classroom alone.</p></div><ol className="experience-trail">{scoutingExperiences.map((experience, index)=><li key={experience}><span>{String(index + 1).padStart(2, '0')}</span>{experience}</li>)}</ol></section>
    <ScoutingJourney />
    <section className="involve-email-contact page-section" id="leaders"><p className="kicker">Have a question?</p><h2>Want to know more?</h2><p>If you have a question about joining or Scouting with Kanteerava, just write to us or call Puneeth.</p><div className="involve-contact-details"><a className="involve-email-address" href="mailto:kanteeravascoutsnguides@gmail.com">kanteeravascoutsnguides@gmail.com</a><p><span>Puneeth</span><a href="tel:+919986825212">9986825212</a></p></div><a className="involve-primary" href="mailto:kanteeravascoutsnguides@gmail.com">Email Kanteerava →</a></section>
    <section className="involve-online page-section"><h2>Stay Connected</h2><nav aria-label="Kanteerava social links">{involvementSocials.map(([label,url])=><a href={url} target="_blank" rel="noopener noreferrer" key={label}>{label} ↗</a>)}</nav></section>
    <section className="involve-final page-section"><p className="kicker">Your journey can start here</p><h2>Come experience<br/><em>Scouting with us.</em></h2><p>Scouting gives young people a place to adventure, belong, learn and grow—for today and for a better future.</p><div><Link className="involve-primary" to="/join">Join the Group →</Link></div></section>
    <section className="involve-return page-section" data-wing="ALUMNI"><p className="kicker">Life Members</p><h2>Always part of<br/><em>Kanteerava.</em></h2><p>Kanteerava connections don&apos;t end with active Scouting. Life Members can stay connected with the group and continue being part of the Kanteerava family.</p><Link className="involve-primary life-member-action" to="/join">Register as a Life Member →</Link></section>
  </>
}

export function HomeProgrammes() { return <section className="home-programmes"><div className="programme-heading"><p className="kicker">Choose your adventure</p><h2>Ways to grow<br/><em>with us.</em></h2><Link to="/programmes">View all programmes <span>→</span></Link></div><div className="programme-grid"><article><h2>01</h2><h3>Outdoor<br/>adventures</h3><p>Camp, hike, discover and lead.</p></article><article><h2>02</h2><h3>Skills for<br/>life</h3><p>Confidence built by doing.</p></article><article><h2>03</h2><h3>Service that<br/>matters</h3><p>Care for people and place.</p></article><article><h2>04</h2><h3>Friends for<br/>the journey</h3><p>A welcoming group for all.</p></article></div></section> }

export function RashtrapatiAwardShowcase() {
  return <section className="rashtrapati-showcase" aria-labelledby="rashtrapati-award-heading">
    <header className="rashtrapati-heading">
      <p className="kicker">Rashtrapati Award</p>
      <h2 id="rashtrapati-award-heading"><span>Recognised at the</span><em>highest level.</em></h2>
      <p>A proud legacy of achievement, service and leadership at Kanteerava.</p>
    </header>
    <div className="rashtrapati-gallery">
      <div className="rashtrapati-photo rashtrapati-photo-main"><img src={rashtrapatiAwardImages[0].src} width="1084" height="592" loading="lazy" alt={rashtrapatiAwardImages[0].alt}/></div>
      <div className="rashtrapati-photo-row">
        {rashtrapatiAwardImages.slice(1).map((image, index) => <div className={`rashtrapati-photo${index === 0 ? ' rashtrapati-photo-padded-source' : ''}`} key={image.src}><img src={image.src} width={index === 0 ? 1080 : 1600} height={index === 0 ? 1072 : 888} loading="lazy" alt={image.alt}/></div>)}
      </div>
    </div>
    <p className="rashtrapati-legacy">Many awardees. One Kanteerava legacy.</p>
  </section>
}
