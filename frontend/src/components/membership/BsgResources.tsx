import type { MembershipResource } from '../../api/membershipApi'

interface BsgResourcesProps {
  resources: MembershipResource[]
  loading: boolean
  error: string
}

export function BsgResources({ resources, loading, error }: BsgResourcesProps) {
  return <section className="bsg-resources member-bsg-resources" aria-labelledby="member-bsg-resources-heading">
    <div>
      <p className="kicker">BSG Resources</p>
      <h2 id="member-bsg-resources-heading">Explore beyond<br/><em>Kanteerava.</em></h2>
      <p>Useful Bharat Scouts and Guides resources for membership and wider opportunities.</p>
    </div>
    <div>
      {loading && <p className="member-resource-state" role="status">Loading member resources...</p>}
      {error && <p className="member-resource-state" role="alert">{error}</p>}
      {!loading && !error && <div className="bsg-resource-grid">{resources.map((resource) => <a href={resource.url} target="_blank" rel="noopener noreferrer" key={resource.id}>
        <span>BSG resource</span>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
        <strong>{resource.action_label} ↗</strong>
      </a>)}</div>}
    </div>
  </section>
}
