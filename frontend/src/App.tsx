import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from './api/axios'
import { getCurrentUser, login, register, type AuthUser } from './api/authApi'
import { approveMembership, applyForMembership, getMembershipPdf, getAdminDashboard, getMemberships, rejectMembership, updateMembership, type AdminSummary, type MemberType, type Membership } from './api/membershipApi'
import { getEvents, type EventItem } from './api/eventApi'
import { getAnnouncements, type AnnouncementItem } from './api/announcementApi'
import { getGalleryAlbums, type GalleryAlbum } from './api/galleryApi'
import { getAchievements, type AchievementItem } from './api/achievementApi'
import { AdminPanel } from './components/admin/AdminPanel'
import { AdminWorkspacePage } from './components/admin/AdminWorkspacePage'
import { MemberDirectory } from './components/admin/MemberDirectory'
import { AuthPanel } from './components/auth/AuthPanel'
import { EventFeed } from './components/events/EventFeed'
import { EventDetails } from './components/events/EventDetails'
import { EventAdminPanel } from './components/events/EventAdminPanel'
import { AnnouncementFeed } from './components/announcements/AnnouncementFeed'
import { AnnouncementDetails } from './components/announcements/AnnouncementDetails'
import { AnnouncementAdminPanel } from './components/announcements/AnnouncementAdminPanel'
import { GalleryAdminPanel } from './components/gallery/GalleryAdminPanel'
import { GalleryFeed } from './components/gallery/GalleryFeed'
import { AchievementFeed } from './components/achievements/AchievementFeed'
import { AchievementAdminPanel } from './components/achievements/AchievementAdminPanel'
import { MembershipPanel } from './components/membership/MembershipPanel'
import type { SignaturePayload } from './components/membership/SignatureInput'
import { Hero } from './components/public/Hero'
import { SocialConnect } from './components/public/SocialConnect'
import { SiteNav } from './components/navigation/SiteNav'
import { AboutPage, ContactPage, HomeProgrammes, ProgrammesPage } from './pages/PublicPages'
import './App.css'

type AuthMode = 'login' | 'register'
type Application = { member_type: MemberType; date_of_birth: string; gender: string; address: string; emergency_contact_name: string; emergency_contact_phone: string; emergency_contact_relationship: string; parent_or_guardian: string; contact_phone: string; postal_code: string; school_college: string; grade_section: string; hobbies: string; introduced_by: string; preferred_patrol: string; previous_experience: string; joining_date: string; applicant_signature_upload: string; applicant_signature_name: string; photo_upload: string; photo_name: string }

const initialApplication: Application = { member_type: 'SCOUT', date_of_birth: '', gender: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '', parent_or_guardian: '', contact_phone: '', postal_code: '', school_college: '', grade_section: '', hobbies: '', introduced_by: '', preferred_patrol: '', previous_experience: '', joining_date: '', applicant_signature_upload: '', applicant_signature_name: '', photo_upload: '', photo_name: '' }

const newApplication = (): Application => ({ ...initialApplication })

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname
  const isHome = path === '/'
  const isAdminPath = path === '/admin' || path.startsWith('/admin/')
  const directoryMatch = path.match(/^\/admin\/members(?:\/([^/]+))?(?:\/([^/]+))?\/?$/)
  const directoryWing = directoryMatch?.[1]?.toUpperCase() as MemberType | undefined
  const directoryMemberId = directoryMatch?.[2]
  const isApplicationsAdmin = path === '/admin/applications'
  const isGalleryAdmin = path === '/admin/gallery'
  const isAchievementsAdmin = path === '/admin/achievements'
  const isEventsAdmin = path === '/admin/events'
  const isNewsroomAdmin = path === '/admin/newsroom'
  const eventDetailId = path.match(/^\/events\/([^/]+)\/?$/)?.[1]
  const announcementDetailId = path.match(/^\/announcements\/([^/]+)\/?$/)?.[1]
  const [status, setStatus] = useState('Connecting to the Scout Group API...')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [message, setMessage] = useState('')
  const [membership, setMembership] = useState<Membership | null>(null)
  const [showApplication, setShowApplication] = useState(false)
  const [application, setApplication] = useState<Application>(newApplication)
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null)
  const [adminApplications, setAdminApplications] = useState<Membership[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventsError, setEventsError] = useState(false)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [announcementsError, setAnnouncementsError] = useState(false)
  const [galleryAlbums, setGalleryAlbums] = useState<GalleryAlbum[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [galleryError, setGalleryError] = useState(false)
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [achievementsLoading, setAchievementsLoading] = useState(true)
  const [achievementsError, setAchievementsError] = useState(false)

  const refreshGalleryAlbums = async () => {
    const response = await getGalleryAlbums()
    setGalleryAlbums(response.data.data)
  }
  const refreshAchievements = async () => {
    const response = await getAchievements()
    setAchievements(response.data.data)
  }
  const refreshEvents = async () => { const response = await getEvents(); setEvents(response.data.data) }
  const refreshAnnouncements = async () => { const response = await getAnnouncements(); setAnnouncements(response.data.data) }
  const refreshMembership = async () => {
    const response = await getMemberships()
    setMembership(response.data.data[0] ?? null)
  }

  useEffect(() => {
    apiClient.get('/health/').then((response) => setStatus(response.data.message)).catch(() => setStatus('The API is unavailable. Start Django on port 8000.'))
    getEvents().then((response) => setEvents(response.data.data)).catch(() => setEventsError(true)).finally(() => setEventsLoading(false))
    getAnnouncements().then((response) => setAnnouncements(response.data.data)).catch(() => setAnnouncementsError(true)).finally(() => setAnnouncementsLoading(false))
    getGalleryAlbums().then((response) => setGalleryAlbums(response.data.data)).catch(() => setGalleryError(true)).finally(() => setGalleryLoading(false))
    getAchievements().then((response) => setAchievements(response.data.data)).catch(() => setAchievementsError(true)).finally(() => setAchievementsLoading(false))
    if (!localStorage.getItem('scout_access_token')) return
    getCurrentUser().then((response) => {
      setUser(response.data.data)
      if (response.data.data.is_admin) {
        getAdminDashboard().then((dashboard) => setAdminSummary(dashboard.data.data)).catch(() => undefined)
        getMemberships().then((items) => setAdminApplications(items.data.data)).catch(() => undefined)
        refreshGalleryAlbums().catch(() => undefined)
        refreshAchievements().catch(() => undefined)
        refreshEvents().catch(() => undefined)
        refreshAnnouncements().catch(() => undefined)
      } else {
        refreshMembership().catch(() => setMembership(null))
      }
    }).catch(() => undefined)
  }, [])

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (mode === 'register') {
        await register({ full_name: fullName, email, password, confirm_password: password, phone: '' })
        setFullName('')
        setEmail('')
        setPassword('')
        setMessage('Account created. Please sign in with your email and password.')
        setMode('login')
        return
      }
      const response = await login(email, password)
      localStorage.setItem('scout_access_token', response.data.data.access)
      localStorage.setItem('scout_refresh_token', response.data.data.refresh)
      setUser(response.data.data.user)
      setEmail('')
      setPassword('')
      setFullName('')
      setApplication(newApplication())
      setShowApplication(false)
      if (response.data.data.user.is_admin) {
        getAdminDashboard().then((dashboard) => setAdminSummary(dashboard.data.data)).catch(() => setMessage('Unable to load the Admin dashboard.'))
        getMemberships().then((items) => setAdminApplications(items.data.data)).catch(() => setMessage('Unable to load membership applications.'))
        refreshGalleryAlbums().catch(() => setMessage('Unable to load gallery management.'))
        refreshAchievements().catch(() => setMessage('Unable to load achievements.'))
        refreshEvents().catch(() => setMessage('Unable to load event management.'))
        refreshAnnouncements().catch(() => setMessage('Unable to load Newsroom management.'))
      } else {
        await refreshMembership().catch(() => setMembership(null))
      }
      setMessage('Welcome back.')
      navigate(response.data.data.user.is_admin ? '/admin' : '/')
    } catch (error) { setMessage(authErrorMessage(error)) }
  }

  const submitMembership = async (event: FormEvent) => {
    event.preventDefault()
    try {
      const response = await applyForMembership({ ...application, joining_date: application.joining_date || null })
      setMembership(response.data.data)
      setShowApplication(false)
      setApplication(newApplication())
      setMessage('Your membership application is pending Admin approval.')
    } catch (error) { setMessage(authErrorMessage(error)) }
  }

  const changeAuthMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    setEmail('')
    setPassword('')
    setFullName('')
    setMessage('')
  }

  const signOut = () => {
    localStorage.removeItem('scout_access_token')
    localStorage.removeItem('scout_refresh_token')
    setUser(null)
    setMembership(null)
    setAdminSummary(null)
    setAdminApplications([])
    setEmail('')
    setPassword('')
    setFullName('')
    setMode('login')
    setShowApplication(false)
    setApplication(newApplication())
    setMessage('')
    refreshGalleryAlbums().catch(() => undefined)
  }

  const approveApplication = async (id: string, signature: SignaturePayload) => {
    try {
      const response = await approveMembership(id, signature)
      setAdminApplications((current) => current.map((item) => item.id === id ? response.data.data : item))
      setAdminSummary((current) => current ? { ...current, pending_applications: Math.max(0, current.pending_applications - 1), total_members: current.total_members + 1 } : current)
      getAdminDashboard().then((dashboard) => setAdminSummary(dashboard.data.data)).catch(() => undefined)
      return response.data.data
    } catch (error) { setMessage(authErrorMessage(error)); throw error }
  }

  const rejectApplication = async (id: string, reason: string) => {
    try {
      await rejectMembership(id, reason)
      setAdminApplications((current) => current.filter((item) => item.id !== id))
      setAdminSummary((current) => current ? { ...current, pending_applications: current.pending_applications - 1 } : current)
    } catch { setMessage('Unable to reject this application.') }
  }

  const saveApplication = async (id: string, payload: Partial<Membership>) => {
    try {
      const response = await updateMembership(id, payload)
      setAdminApplications((current) => current.map((item) => item.id === id ? response.data.data : item))
      setMessage('Application corrections saved.')
      return response.data.data
    } catch { setMessage('Unable to save application corrections.') }
  }

  const saveApplicantSignature = async (id: string, signature: SignaturePayload) => {
    const response = await updateMembership(id, { applicant_signature_upload: signature.data, applicant_signature_name: signature.name })
    setMembership(response.data.data)
    setMessage('Your signature has been saved for Admin review.')
  }

  const openMembershipForm = async (id: string, download = false) => {
    const viewer = download ? null : window.open('about:blank', '_blank')
    if (viewer) viewer.opener = null
    try {
      const response = await getMembershipPdf(id, download)
      const url = URL.createObjectURL(response.data)
      if (download) {
        const link = document.createElement('a')
        link.href = url
        link.download = 'membership-application.pdf'
        link.click()
      } else if (viewer) viewer.location.href = url
      else window.open(url, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (error) {
      viewer?.close()
      setMessage(authErrorMessage(error))
    }
  }

  const pageContent = path === '/about' ? <AboutPage /> : path === '/programmes' ? <ProgrammesPage /> : path === '/contact' ? <ContactPage /> : path === '/events' ? <EventFeed events={events} loading={eventsLoading} error={eventsError} /> : eventDetailId ? <EventDetails id={eventDetailId} /> : path === '/gallery' ? <GalleryFeed albums={galleryAlbums} loading={galleryLoading} error={galleryError} /> : path === '/achievements' ? <AchievementFeed items={achievements} loading={achievementsLoading} error={achievementsError} /> : path === '/announcements' ? <AnnouncementFeed announcements={announcements} loading={announcementsLoading} error={announcementsError} /> : announcementDetailId ? <AnnouncementDetails id={announcementDetailId} /> : null

  return <main className="shell">
    <div className="utility"><span>XV KANTEERAVA OPEN UNIT</span><span>Adventure • Service • Community</span></div>
    {!isHome && <SiteNav user={user} internal onSignOut={signOut} />}
    {isHome && <><section className="hero"><SiteNav user={user} onSignOut={signOut} /><Hero status={status} /></section></>}
    {isHome && <HomeProgrammes />}
    {isAdminPath && <section className="admin-hero"><p className="kicker">XVK Scout Group</p><h1>Admin<br /><em>workspace.</em></h1><p>Manage memberships and the work behind the movement.</p></section>}
    {pageContent}
    {user && path === '/join' && <MembershipPanel membership={membership} message={message} showApplication={showApplication} application={application} onOpenApplication={() => setShowApplication(true)} onUpdateApplication={(field, value) => setApplication((current) => ({ ...current, [field]: value }))} onSubmitApplication={submitMembership} onSaveSignature={saveApplicantSignature} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} />}
    {path === '/admin' && user?.is_admin && adminSummary && <AdminPanel summary={adminSummary} message={message} applications={adminApplications} onApprove={approveApplication} onReject={rejectApplication} onUpdate={saveApplication} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} />}
    {isApplicationsAdmin && user?.is_admin && adminSummary && <AdminWorkspacePage label="Membership Applications" title="Membership Applications" description="Review and manage new membership requests."><AdminPanel view="applications" summary={adminSummary} message={message} applications={adminApplications} onApprove={approveApplication} onReject={rejectApplication} onUpdate={saveApplication} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} /></AdminWorkspacePage>}
    {directoryMatch && user?.is_admin && <AdminWorkspacePage label="Member Directory" keepChildHeading><MemberDirectory key={path} wing={directoryWing} memberId={directoryMemberId} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} /></AdminWorkspacePage>}
    {isGalleryAdmin && user?.is_admin && <AdminWorkspacePage label="Gallery" title="Gallery" description="Create albums, upload photos, edit albums and manage gallery content."><GalleryAdminPanel albums={galleryAlbums} events={events} onRefreshAlbums={refreshGalleryAlbums} /></AdminWorkspacePage>}
    {isAchievementsAdmin && user?.is_admin && <AdminWorkspacePage label="Achievements" title="Achievements" description="Add, edit and manage group achievements and recognitions."><AchievementAdminPanel items={achievements} onRefresh={refreshAchievements} /></AdminWorkspacePage>}
    {isEventsAdmin && user?.is_admin && <AdminWorkspacePage label="Events" title="Events" description="Create, publish and manage upcoming and past events."><EventAdminPanel events={events} onRefresh={refreshEvents} /></AdminWorkspacePage>}
    {isNewsroomAdmin && user?.is_admin && <AdminWorkspacePage label="Newsroom" title="Newsroom" description="Create and manage notices, updates, reports and stories."><AnnouncementAdminPanel posts={announcements} onRefresh={refreshAnnouncements} /></AdminWorkspacePage>}
    {((path === '/join' || isAdminPath) && !user) && <AuthPanel mode={mode} email={email} password={password} fullName={fullName} message={message} onModeChange={changeAuthMode} onEmailChange={setEmail} onPasswordChange={setPassword} onFullNameChange={setFullName} onSubmit={submitAuth} adminOnly={isAdminPath} />}
    {isAdminPath && user && !user.is_admin && <section className="route-message"><h2>Admin access required.</h2><p>This account does not have permission to access the workspace.</p></section>}
    {isHome && <SocialConnect />}
    <footer><span className="footer-signature">Made with ❤️, by Kanteeravas, for Kanteerava. ⚜️</span><a className="footer-email" href="mailto:kanteeravascoutsnguides@gmail.com">kanteeravascoutsnguides@gmail.com</a></footer>
  </main>
}

function authErrorMessage(error: unknown): string {
  if (!isAxiosError(error) || !error.response?.data) return 'Unable to connect to the server. Please try again.'

  const data = error.response.data
  if (typeof data.message === 'string') return data.message
  if (typeof data.detail === 'string') return data.detail

  const [field, messages] = Object.entries(data)[0] ?? []
  if (field && messages) {
    const message = Array.isArray(messages) ? messages.join(' ') : String(messages)
    return `${field.replaceAll('_', ' ')}: ${message}`
  }
  return 'Unable to complete your request. Please check the form and try again.'
}

export default App



