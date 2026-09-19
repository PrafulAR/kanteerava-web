import bunnyCharacter from '../../assets/journey-bunny.png'
import cubCharacter from '../../assets/journey-cub-bulbul.png'
import scoutCharacter from '../../assets/journey-scout-guide.png'
import roverCharacter from '../../assets/journey-rover-ranger.png'

const stages = [
  { key: 'bunny', number: '01', title: 'Bunny', age: '3–5 Years', note: 'First steps', character: bunnyCharacter },
  { key: 'cub', number: '02', title: 'Cub / Bulbul', age: '5–10 Years', note: 'Discover', character: cubCharacter },
  { key: 'scout', number: '03', title: 'Scout / Guide', age: '11–16 Years', note: 'Explore', character: scoutCharacter },
  { key: 'rover', number: '04', title: 'Rover / Ranger', age: '17–25 Years', note: 'Lead & serve', character: roverCharacter },
]

export function ScoutingJourney() {
  return <section className="scouting-journey scouting-journey-vertical" aria-labelledby="scouting-journey-title">
    <header className="journey-heading"><p className="kicker">The Scouting Journey</p><h2 id="scouting-journey-title">Growing through<br/><em>Scouting.</em></h2></header>
    <ol className="journey-track">{stages.map((stage) => <li className={`journey-stage journey-${stage.key}`} key={stage.key} tabIndex={0}><div className="journey-marker" aria-hidden="true"><span>{stage.number}</span></div><div className="journey-stage-panel"><img className="journey-character" src={stage.character} alt="" aria-hidden="true"/><div className="journey-copy"><h3>{stage.title}</h3><strong>{stage.age}</strong><p>{stage.note}</p></div></div></li>)}</ol>
  </section>
}
