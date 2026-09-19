import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { AuthUser } from '../../api/authApi'
import kanteeravaCrest from '../../assets/kanteerava-crest.png'

interface SiteNavProps {
  user: AuthUser | null
  internal?: boolean
  onSignOut: () => void
}

export function SiteNav({ user, internal = false, onSignOut }: SiteNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = user?.full_name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'

  return (
    <nav className={`site-nav${internal ? ' page-nav' : ''}`} aria-label="Main navigation">
      <Link className="brand" to="/" aria-label="XVK Scout Group home">
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
      <button className="nav-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation"><span/><span/><span/></button>
      {!user && <Link className="action-button" to="/join">Join the group</Link>}
      {user && <div className="user-menu">
        <button className="user-trigger" type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-haspopup="menu">
          <span className="user-avatar" aria-hidden="true">{initials}</span><span className="user-name">{user.full_name}</span><span className="user-caret" aria-hidden="true">⌄</span>
        </button>
        {menuOpen && <div className="user-dropdown" role="menu">
          <span>{user.email}</span>
          <Link to="/join" role="menuitem" onClick={() => setMenuOpen(false)}>My membership</Link>
          <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut() }}>Log out</button>
        </div>}
      </div>}
      {menuOpen && <div className="mobile-nav-panel">
        <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink><NavLink to="/about" onClick={() => setMenuOpen(false)}>Who we are</NavLink><NavLink to="/programmes" onClick={() => setMenuOpen(false)}>What we do</NavLink><NavLink to="/events" onClick={() => setMenuOpen(false)}>Events</NavLink><NavLink to="/gallery" onClick={() => setMenuOpen(false)}>Gallery</NavLink><NavLink to="/achievements" onClick={() => setMenuOpen(false)}>Achievements</NavLink><NavLink to="/announcements" onClick={() => setMenuOpen(false)}>Newsroom</NavLink><NavLink to="/contact" onClick={() => setMenuOpen(false)}>Get involved</NavLink>
        {user?.is_admin && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>}
        {user ? <><Link to="/join" onClick={() => setMenuOpen(false)}>My membership</Link><button type="button" onClick={() => { setMenuOpen(false); onSignOut() }}>Log out</button></> : <Link to="/join" onClick={() => setMenuOpen(false)}>Join the group</Link>}
      </div>}
    </nav>
  )
}
