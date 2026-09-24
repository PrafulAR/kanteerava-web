import { useLocation, useNavigate } from 'react-router-dom'

export interface ContextualBackState {
  contextualBack?: {
    label: string
    to: string
  }
}

export function ContextualBackButton() {
  const location = useLocation()
  const navigate = useNavigate()
  const context = (location.state as ContextualBackState | null)?.contextualBack
  const validTarget = context?.to.startsWith('/') && !context.to.startsWith('//')

  if (!context || !validTarget) return null

  return <button className="contextual-back" type="button" onClick={() => navigate(context.to)} aria-label={context.label}>
    <span aria-hidden="true">←</span> {context.label}
  </button>
}
