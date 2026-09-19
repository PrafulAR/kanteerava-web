import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface AdminWorkspacePageProps {
  label: string
  title?: string
  description?: string
  children: ReactNode
  keepChildHeading?: boolean
}

export function AdminWorkspacePage({ label, title, description, children, keepChildHeading = false }: AdminWorkspacePageProps) {
  return (
    <section className={`admin-workspace-route${keepChildHeading ? ' keep-child-heading' : ''}`}>
      <div className="admin-workspace-route-header">
        <p className="admin-breadcrumb"><Link to="/admin">Admin Workspace</Link><span aria-hidden="true">/</span>{label}</p>
        {title && <h2>{title}</h2>}
        {description && <p className="admin-workspace-description">{description}</p>}
        <Link className="admin-workspace-back" to="/admin">← Back to Admin Workspace</Link>
      </div>
      <div className="admin-workspace-route-body">{children}</div>
    </section>
  )
}
