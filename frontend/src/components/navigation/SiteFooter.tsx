import { SOCIAL_LINKS } from '../../config/socialLinks'

const footerSocials = [
  { key: 'instagram', label: 'Instagram', path: <><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="17.4" cy="6.7" r="1" className="fill-mark"/></> },
  { key: 'facebook', label: 'Facebook', path: <path d="M14.2 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.6 1.7-1.6h1.7V3.8c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.6V10H7.7v3h2.9v8h3.6Z"/> },
  { key: 'google', label: 'Google', path: <path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.8v2.4h3.1c1.8-1.7 2.7-4.1 2.7-6.9ZM12 21c2.6 0 4.8-.9 6.3-2.3l-3.1-2.4c-.9.6-2 1-3.2 1a5.6 5.6 0 0 1-5.3-3.9H3.5v2.5A9.5 9.5 0 0 0 12 21ZM6.7 13.4a5.7 5.7 0 0 1 0-3.6V7.3H3.5a9.5 9.5 0 0 0 0 8.6l3.2-2.5ZM12 5.9c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.4 9.4 0 0 0 3.5 7.3l3.2 2.5A5.6 5.6 0 0 1 12 5.9Z"/> },
] as const

export function SiteFooter() {
  return <footer>
    <span className="footer-signature">Made with ❤️, by Kanteeravas, for Kanteerava. ⚜️</span>
    <nav className="footer-socials" aria-label="Kanteerava social links">
      {footerSocials.map((social) => <a key={social.key} href={SOCIAL_LINKS[social.key]} target="_blank" rel="noopener noreferrer" aria-label={`Visit Kanteerava on ${social.label}`} title={social.label}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{social.path}</svg>
      </a>)}
    </nav>
  </footer>
}
