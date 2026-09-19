import type { FormEvent } from 'react'

type AuthMode = 'login' | 'register'

interface AuthPanelProps {
  mode: AuthMode
  email: string
  password: string
  fullName: string
  message: string
  onModeChange: (mode: AuthMode) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onFullNameChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  adminOnly?: boolean
}

export function AuthPanel({ mode, email, password, fullName, message, onModeChange, onEmailChange, onPasswordChange, onFullNameChange, onSubmit, adminOnly = false }: AuthPanelProps) {
  return (
    <section className="auth-panel">
      {adminOnly ? <div className="panel-heading"><p className="kicker">Restricted area</p><h2>Admin sign in</h2></div> : <div className="auth-tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => onModeChange('login')}>Sign in</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => onModeChange('register')}>Create account</button>
      </div>}
      <form onSubmit={onSubmit} autoComplete="on">
        {!adminOnly && mode === 'register' && <input required name="name" autoComplete="name" placeholder="Full name" value={fullName} onChange={(event) => onFullNameChange(event.target.value)} />}
        <input required name="email" autoComplete="email" type="email" placeholder="Email address" value={email} onChange={(event) => onEmailChange(event.target.value)} />
        <input required name="password" autoComplete={mode === 'register' && !adminOnly ? 'new-password' : 'current-password'} minLength={8} type="password" placeholder="Password" value={password} onChange={(event) => onPasswordChange(event.target.value)} />
        <button className="submit" type="submit">{adminOnly ? 'Enter admin workspace' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
      </form>
      {message && <p className="form-message">{message}</p>}
    </section>
  )
}
