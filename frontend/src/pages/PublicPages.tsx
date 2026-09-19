import weeklyMeetingsArt from '../assets/activity-weekly-meetings.webp'
import campsArt from '../assets/activity-camps-trekking.webp'
import hikingArt from '../assets/activity-hiking-adventure.webp'
import serviceArt from '../assets/activity-community-service.webp'
import environmentArt from '../assets/activity-environmental-awareness.webp'
import skillsArt from '../assets/activity-skill-development.webp'
import leadershipArt from '../assets/activity-leadership-training.webp'
import internationalArt from '../assets/activity-international-events.webp'
import { Link } from 'react-router-dom'
import { ScoutingJourney } from '../components/public/ScoutingJourney'

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

export function AboutPage() {
  return <><section className="page-intro"><p className="kicker">Who we are</p><h1>A legacy of<br/><em>service since 1946.</em></h1><p>XV Kanteerava Open Unit is one of Karnataka's enduring Scouting and Guiding communities.</p></section><section className="identity-story page-section">
    <div className="identity-story-heading"><p className="kicker">Our story</p><h2>Generations shaped<br/>by <em>purpose.</em></h2></div>
    <div className="identity-copy"><p><strong>XV Kanteerava Open Unit</strong> has been a proud part of the Scouting movement since <strong>1946</strong>. Founded by Scout Masters Mr. Sriram and Mr. Ramrao Khate, the group has grown through generations while carrying forward the values, traditions, and spirit of Scouting.</p><p>Over the years, Kanteerava has grown into a strong and active Scouting and Guiding community through the dedication of our leaders and members. We believe in developing discipline, leadership, teamwork, service, and responsibility among young people.</p></div>
    <aside className="why-xv"><div className="why-xv-mark">XV</div><div><p className="kicker">A number with a story</p><h3>Why XV?</h3><p>The “XV” in our name is the Roman numeral for 15. Kanteerava became the 15th Chartered Scouting Unit in the Mysore Province, and that number has remained a proud part of our identity and heritage ever since.</p></div></aside>
    <div className="group-units"><article><span>Scout Group</span><h3>XV Kanteerava Open Scout Group</h3><ul><li>Kanteerava Cub Pack</li><li>Kanteerava Scout Troop</li><li>Kanteerava Rover Crew</li></ul></article><article><span>Guide Group</span><h3>Kanteerava Open Guide Group</h3><ul><li>Kanteerava Bulbul Flock</li><li>Kanteerava Guide Company</li><li>Kanteerava Ranger Team</li></ul></article></div>
    <p className="identity-closing">With a proud history spanning generations, Kanteerava continues to follow the true spirit of Scouting and Guiding while helping young people become responsible and confident citizens.</p>
  </section></>
}

export function ProgrammesPage() {
  return <><section className="page-intro page-blue"><p className="kicker">What we do</p><h1>Learn by doing.<br/><em>Grow through adventure.</em></h1><p>At Kanteerava, every activity builds practical skills, confidence, friendship, and a lifelong commitment to service.</p></section><section className="programme-story page-section"><div className="programme-story-intro"><p className="kicker">Skills for life</p><h2>Every experience<br/>has a <em>purpose.</em></h2><p>At Kanteerava, Scouting is about <strong>learning by doing, serving the community, exploring the outdoors, and building skills for life</strong>.</p></div><div className="activity-list">{activities.map((activity, index) => <article className={`activity-card activity-card-${activity.key}`} key={activity.title}><span>{String(index + 1).padStart(2, '0')}</span><strong>{activity.title}</strong><img className="activity-art" src={activity.image} width="720" height="480" loading="lazy" alt={activity.alt}/></article>)}</div><div className="programme-narrative"><p>Our Cubs, Bulbuls, Scouts, Guides, Rovers, and Rangers take part in experiences that challenge them to work together, lead responsibly, and serve the world around them.</p><p>Our members have represented Kanteerava at State and National camps, as well as international events and Jamborees in the <strong>Bangladesh, Japan, Malaysia, Nepal, Philippines, Portugal, Sri Lanka, South Korea and USA</strong>.</p><p>Through every camp, activity, adventure, and service project, we create memorable experiences while preparing young people to make a positive difference in society.</p></div><blockquote><span><b>Our</b> motto</span><strong>Scouting... Our Lifeline.</strong></blockquote></section></>
}

const involvementSocials = [
  ['Instagram','https://www.instagram.com/xv_kanteerava_open_unit/'],
  ['Facebook','https://www.facebook.com/p/Kanteerava-Scouts-and-Guides-100071265575034/'],
  ['Google','https://share.google/pqSoMaHOijLaguqUX'],
  ['Google Maps','https://www.google.com/maps/place/Xv+Kanteerava+Scout+Group/@12.9575828,77.5726532,808m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3bae1532a9c96d85:0xdc5404557c95024e!8m2!3d12.9575828!4d77.5726532!16s%2Fg%2F11s5vvyscd'],
]

const scoutingExperiences = ['Camp under the stars', 'Go trekking and hiking', 'Learn practical skills', 'Make new friends', 'Work as a team', 'Serve your community', 'Take on challenges', 'Grow into a leader']

export function ContactPage() { return <>
  <section className="involve-hero"><p className="kicker">Get involved</p><h1>There’s a place for every<br/><em>young adventurer.</em></h1><p>Scouting is about more than uniforms and camps. It’s about making friends, trying new things, exploring the outdoors, learning skills for life and growing into someone who can make a difference.</p><p className="involve-hero-note">At Kanteerava, there’s a place for every young adventurer.</p><Link className="involve-primary" to="/join">Join the Group →</Link></section>

  <section className="involve-experiences page-section"><div className="involve-experiences-heading"><p className="kicker">More than just a weekly meeting</p><h2>Experience it<br/><em>for yourself.</em></h2><p>Scouting gives young people experiences that are difficult to learn from a classroom alone.</p></div><ol className="experience-trail">{scoutingExperiences.map((experience, index)=><li key={experience}><span>{String(index + 1).padStart(2, '0')}</span>{experience}</li>)}</ol></section>

  <ScoutingJourney />

  <section className="involve-email-contact page-section" id="leaders"><p className="kicker">Have a question?</p><h2>Want to know more?</h2><p>If you have a question about joining or Scouting with Kanteerava, just write to us.</p><a className="involve-email-address" href="mailto:kanteeravascoutsnguides@gmail.com">kanteeravascoutsnguides@gmail.com</a><a className="involve-primary" href="mailto:kanteeravascoutsnguides@gmail.com">Email Kanteerava →</a></section>

  <section className="involve-online page-section"><h2>Stay Connected</h2><nav aria-label="Kanteerava social links">{involvementSocials.map(([label,url])=><a href={url} target="_blank" rel="noopener noreferrer" key={label}>{label} ↗</a>)}</nav></section>

  <section className="involve-final page-section"><p className="kicker">Your journey can start here</p><h2>Come experience<br/><em>Scouting with us.</em></h2><p>Scouting gives young people a place to adventure, belong, learn and grow—for today and for a better future.</p><div><Link className="involve-primary" to="/join">Join the Group →</Link></div></section>

  <section className="involve-return page-section" data-wing="ALUMNI"><p className="kicker">Life Members</p><h2>Always part of<br/><em>Kanteerava.</em></h2><p>Kanteerava connections don’t end with active Scouting. Life Members can stay connected with the group and continue being part of the Kanteerava family.</p><Link className="involve-primary life-member-action" to="/join">Register as a Life Member →</Link></section>
</> }

export function HomeProgrammes() { return <section className="home-programmes"><div className="programme-heading"><p className="kicker">Choose your adventure</p><h2>Ways to grow<br/><em>with us.</em></h2><a href="/programmes">View all programmes <span>→</span></a></div><div className="programme-grid"><article><h2>01</h2><h3>Outdoor<br/>adventures</h3><p>Camp, hike, discover and lead.</p></article><article><h2>02</h2><h3>Skills for<br/>life</h3><p>Confidence built by doing.</p></article><article><h2>03</h2><h3>Service that<br/>matters</h3><p>Care for people and place.</p></article><article><h2>04</h2><h3>Friends for<br/>the journey</h3><p>A welcoming group for all.</p></article></div></section> }
