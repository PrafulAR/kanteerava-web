import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  completePasswordReset,
  googleLogin,
  login,
  register,
  requestPasswordReset,
  resendPasswordResetCode,
  resendRegistrationCode,
  verifyPasswordReset,
  verifyRegistration,
  type LoginResponse,
} from '../../api/authApi'

type AuthMode = 'login' | 'register'
type AuthStage = 'credentials' | 'registration-code' | 'forgot-email' | 'reset-code' | 'reset-password' | 'reset-complete'

interface AuthPanelProps {
  onAuthenticated: (response: LoginResponse) => Promise<void> | void
  adminOnly?: boolean
}

interface GoogleCredentialResponse {
  credential?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const googleScriptId = 'google-identity-services'
let googleInitializedClientId = ''
let activeGoogleCredentialHandler: ((response: GoogleCredentialResponse) => void) | null = null

function errorMessage(error: unknown) {
  if (!isAxiosError(error) || !error.response?.data) return 'Unable to connect to the server. Please try again.'
  const responseData = error.response.data
  if (typeof responseData !== 'object' || responseData === null || Array.isArray(responseData)) {
    return 'Unable to complete this request. Please try again.'
  }
  const data = responseData as { message?: string; detail?: string; errors?: Record<string, string[] | string> } & Record<string, unknown>
  if (typeof data.message === 'string') return data.message
  if (typeof data.detail === 'string') return data.detail
  if (data.errors) {
    const [, value] = Object.entries(data.errors)[0] ?? []
    if (value) return Array.isArray(value) ? value.join(' ') : String(value)
  }
  const [field, value] = Object.entries(data).find(([key]) => !['success', 'message', 'errors'].includes(key)) ?? []
  if (field && value) return `${field.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(' ') : String(value)}`
  return 'Unable to complete this request. Please check the form and try again.'
}

export function AuthPanel({ onAuthenticated, adminOnly = false }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [stage, setStage] = useState<AuthStage>('credentials')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [resetGrant, setResetGrant] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [googleUnavailable, setGoogleUnavailable] = useState(false)
  const googleButton = useRef<HTMLDivElement>(null)
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  useEffect(() => {
    if (stage !== 'credentials' || !googleClientId || !googleButton.current) return
    let cancelled = false
    setGoogleUnavailable(false)
    const handleCredential = async ({ credential }: GoogleCredentialResponse) => {
      if (!credential || cancelled) return
      setBusy(true)
      setMessage('')
      try {
        const response = await googleLogin(credential)
        await onAuthenticated(response.data.data)
      } catch (error) {
        setMessage(errorMessage(error))
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    activeGoogleCredentialHandler = handleCredential
    const render = () => {
      if (cancelled || !window.google || !googleButton.current) return
      googleButton.current.replaceChildren()
      if (googleInitializedClientId !== googleClientId) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response) => activeGoogleCredentialHandler?.(response),
        })
        googleInitializedClientId = googleClientId
      }
      window.google.accounts.id.renderButton(googleButton.current, {
        type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: 320,
      })
    }
    if (window.google) render()
    else {
      let script = document.getElementById(googleScriptId) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = googleScriptId
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render)
      const unavailable = () => { if (!cancelled) setGoogleUnavailable(true) }
      script.addEventListener('error', unavailable)
      return () => {
        cancelled = true
        if (activeGoogleCredentialHandler === handleCredential) activeGoogleCredentialHandler = null
        script?.removeEventListener('load', render)
        script?.removeEventListener('error', unavailable)
      }
    }
    return () => {
      cancelled = true
      if (activeGoogleCredentialHandler === handleCredential) activeGoogleCredentialHandler = null
    }
  }, [googleClientId, onAuthenticated, stage])

  const changeMode = (next: AuthMode) => {
    setMode(next)
    setStage('credentials')
    setPassword('')
    setConfirmPassword('')
    setMessage('')
  }

  const submitCredentials = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (mode === 'register' && password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        const response = await register({ full_name: fullName, email, password, confirm_password: confirmPassword, phone: '' })
        setChallenge(response.data.data.challenge)
        setMaskedEmail(response.data.data.masked_email)
        setCooldown(response.data.data.cooldown_seconds)
        setCode('')
        setStage('registration-code')
      } else {
        const response = await login(email, password)
        await onAuthenticated(response.data.data)
      }
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      if (stage === 'registration-code') {
        await verifyRegistration(challenge, code)
        setMode('login')
        setStage('credentials')
        setPassword('')
        setConfirmPassword('')
        setCode('')
        setMessage('Your email is verified. Sign in to continue.')
      } else {
        const response = await verifyPasswordReset(challenge, code)
        setResetGrant(response.data.data.grant)
        setResetToken(response.data.data.reset_token)
        setCode('')
        setStage('reset-password')
      }
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const resendCode = async () => {
    if (cooldown > 0 || busy) return
    setBusy(true)
    setMessage('')
    try {
      const response = stage === 'registration-code'
        ? await resendRegistrationCode(challenge)
        : await resendPasswordResetCode(challenge)
      setChallenge(response.data.data.challenge)
      setMaskedEmail(response.data.data.masked_email)
      setCooldown(response.data.data.cooldown_seconds)
      setCode('')
      setMessage('A new code has been sent.')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const submitForgotEmail = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await requestPasswordReset(email)
      setChallenge(response.data.data.challenge)
      setMaskedEmail(response.data.data.masked_email)
      setCooldown(response.data.data.cooldown_seconds)
      setCode('')
      setStage('reset-code')
      setMessage('If an account exists for that email, a verification code has been sent.')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const submitNewPassword = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (newPassword !== confirmNewPassword) {
      setMessage('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      await completePasswordReset({ grant: resetGrant, reset_token: resetToken, new_password: newPassword, confirm_new_password: confirmNewPassword })
      setPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setResetGrant('')
      setResetToken('')
      setStage('reset-complete')
    } catch (error) {
      setMessage(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  const authHeading = adminOnly ? 'Admin sign in' : mode === 'register' ? 'Create your account' : 'Welcome back'

  return (
    <section className="auth-panel" aria-busy={busy}>
      {stage === 'credentials' && <>
        {adminOnly
          ? <div className="panel-heading"><p className="kicker">Restricted area</p><h2>{authHeading}</h2></div>
          : <div className="auth-tabs" role="tablist" aria-label="Account access">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Create account</button>
            </div>}
        {!adminOnly && <div className="auth-heading"><p className="kicker">XVK account</p><h2>{authHeading}</h2></div>}
        <form onSubmit={submitCredentials} autoComplete="on">
          {!adminOnly && mode === 'register' && <label className="auth-field auth-wide"><span>Full name</span><input required name="name" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} /></label>}
          <label className="auth-field auth-wide"><span>Email address</span><input required name="email" autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label className={`auth-field ${mode === 'login' || adminOnly ? 'auth-wide' : ''}`}><span>Password</span><input required name="password" autoComplete={mode === 'register' && !adminOnly ? 'new-password' : 'current-password'} minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {!adminOnly && mode === 'register' && <label className="auth-field"><span>Confirm password</span><input required name="confirm-password" autoComplete="new-password" minLength={8} type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}
          {(mode === 'login' || adminOnly) && <button className="auth-text-button auth-wide" type="button" onClick={() => { setStage('forgot-email'); setMessage('') }}>Forgot password?</button>}
          <button className="submit auth-wide" type="submit" disabled={busy}>{busy ? 'Please wait...' : adminOnly ? 'Enter admin workspace' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        {googleClientId && !googleUnavailable ? <div className="google-signin" ref={googleButton} /> : <button type="button" className="google-placeholder" disabled title={googleUnavailable ? 'Google sign-in is temporarily unavailable' : 'Google sign-in is not configured'}>Continue with Google</button>}
      </>}

      {(stage === 'registration-code' || stage === 'reset-code') && <div className="auth-step">
        <p className="kicker">Email verification</p>
        <h2>{stage === 'registration-code' ? 'Verify your email.' : 'Enter your reset code.'}</h2>
        <p>Enter the 6-digit code sent to <strong>{maskedEmail}</strong>. It expires in 10 minutes.</p>
        <form onSubmit={submitCode}>
          <label className="auth-field auth-wide"><span>Verification code</span><input className="otp-input" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></label>
          <button className="submit auth-wide" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying...' : 'Verify code'}</button>
        </form>
        <div className="auth-secondary-actions">
          <button type="button" onClick={resendCode} disabled={cooldown > 0 || busy}>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}</button>
          <button type="button" onClick={() => { setStage('credentials'); setMode('login'); setMessage('') }}>Back to sign in</button>
        </div>
      </div>}

      {stage === 'forgot-email' && <div className="auth-step">
        <p className="kicker">Account recovery</p><h2>Reset your password.</h2>
        <p>Enter your account email. If it exists, we will send a verification code.</p>
        <form onSubmit={submitForgotEmail}>
          <label className="auth-field auth-wide"><span>Email address</span><input required autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <button className="submit auth-wide" type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send verification code'}</button>
        </form>
        <button className="auth-back" type="button" onClick={() => { setStage('credentials'); setMessage('') }}>Back to sign in</button>
      </div>}

      {stage === 'reset-password' && <div className="auth-step">
        <p className="kicker">Secure your account</p><h2>Choose a new password.</h2>
        <p>Use at least 8 characters and avoid common or entirely numeric passwords.</p>
        <form onSubmit={submitNewPassword}>
          <label className="auth-field"><span>New password</span><input required autoComplete="new-password" minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
          <label className="auth-field"><span>Confirm new password</span><input required autoComplete="new-password" minLength={8} type="password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} /></label>
          <button className="submit auth-wide" type="submit" disabled={busy}>{busy ? 'Updating...' : 'Reset password'}</button>
        </form>
      </div>}

      {stage === 'reset-complete' && <div className="auth-step auth-success">
        <p className="kicker">Password updated</p><h2>Your account is secure.</h2>
        <p>Your password has been reset. Existing sessions have been invalidated.</p>
        <button className="submit" type="button" onClick={() => { setMode('login'); setStage('credentials'); setMessage('') }}>Return to sign in</button>
      </div>}

      {message && <p className="form-message" role="status">{message}</p>}
    </section>
  )
}
