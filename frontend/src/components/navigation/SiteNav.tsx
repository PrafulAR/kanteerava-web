import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { AuthUser } from '../../api/authApi'
import kanteeravaCrest from '../../assets/kanteerava-crest.png'

interface SiteNavProps {
  user: AuthUser | null
  internal?: boolean
  onSignOut: () => void
}

export function SiteNav({ user, internal = false, onSignOut }: SiteNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const initials = user?.full_name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'

  useEffect(() => {
    if (!userOpen && !mobileOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setUserOpen(false)
      setMobileOpen(false)
    }
    const closeUserMenuOutside = (event: PointerEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserOpen(false)
      if (!navRef.current?.contains(event.target as Node)) setMobileOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeUserMenuOutside)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeUserMenuOutside)
    }
  }, [mobileOpen, userOpen])

  return (
    <nav ref={navRef} className={`site-nav${internal ? ' page-nav' : ''}`} aria-label="Main navigation">
      <Link className="brand" to="/" aria-label="XVK Scout Group home" onClick={() => setMobileOpen(false)}>
        <img className="brand-mark" src={kanteeravaCrest} alt="Kanteerava Scouts and Guides crest" />
      </Link>
      <div className="nav-links">
        <NavLink to="/" end>Home</NavLink>
        <NavLink to="/about">Who we are</NavLink>
        <NavLink to="/programmes">What we do</NavLink>
        <NavLink to="/events">Events</NavLink>
        <NavLink to="/gallery">Gallery</NavLink>
        <NavLink to="/achievements">Achievements</NavLink>
        <NavLink to="/announcements">Newsroom</NavLink>
        <NavLink to="/contact">Get involved</NavLink>
        {user?.is_admin && <NavLink to="/admin">Admin</NavLink>}
      </div>
      <button className="nav-toggle" type="button" onClick={() => setMobileOpen((open) => !open)} aria-expanded={mobileOpen} aria-controls="mobile-navigation" aria-label="Toggle navigation"><span/><span/><span/></button>
      {!user && <Link className="action-button" to="/join">Join the group</Link>}
      {user && <div className="user-menu" ref={userMenuRef}>
        <button className="user-trigger" type="button" onClick={() => setUserOpen((open) => !open)} aria-expanded={userOpen} aria-haspopup="menu">
          <span className="user-avatar" aria-hidden="true">{initials}</span><span className="user-name">{user.full_name}</span><span className="user-caret" aria-hidden="true">⌄</span>
        </button>
        {userOpen && <div className="user-dropdown" role="menu">
          <span>{user.email}</span>
          <Link to="/join" role="menuitem" onClick={() => setUserOpen(false)}>My membership</Link>
          <button type="button" role="menuitem" onClick={() => { setUserOpen(false); onSignOut() }}>Log out</button>
        </div>}
      </div>}
      {mobileOpen && <div className="mobile-nav-panel" id="mobile-navigation">
        <NavLink to="/" end onClick={() => setMobileOpen(false)}>Home</NavLink><NavLink to="/about" onClick={() => setMobileOpen(false)}>Who we are</NavLink><NavLink to="/programmes" onClick={() => setMobileOpen(false)}>What we do</NavLink><NavLink to="/events" onClick={() => setMobileOpen(false)}>Events</NavLink><NavLink to="/gallery" onClick={() => setMobileOpen(false)}>Gallery</NavLink><NavLink to="/achievements" onClick={() => setMobileOpen(false)}>Achievements</NavLink><NavLink to="/announcements" onClick={() => setMobileOpen(false)}>Newsroom</NavLink><NavLink to="/contact" onClick={() => setMobileOpen(false)}>Get involved</NavLink>
        {user?.is_admin && <NavLink to="/admin" onClick={() => setMobileOpen(false)}>Admin</NavLink>}
        {user ? <><Link to="/join" onClick={() => setMobileOpen(false)}>My membership</Link><button type="button" onClick={() => { setMobileOpen(false); onSignOut() }}>Log out</button></> : <Link to="/join" onClick={() => setMobileOpen(false)}>Join the group</Link>}
      </div>}
    </nav>
  )
}
