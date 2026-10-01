import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import apiClient from './api/axios'
import { getCurrentUser, logout, type AuthUser, type LoginResponse } from './api/authApi'
import { approveMembership, applyForMembership, deleteMembership, getMembershipPdf, getAdminDashboard, getMembershipResources, getMemberships, getMyMemberships, rejectMembership, updateMembership, type AdminSummary, type MemberType, type Membership, type MembershipResource } from './api/membershipApi'
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
import { MembershipPanel, type MembershipApplication } from './components/membership/MembershipPanel'
import type { SignaturePayload } from './components/membership/SignatureInput'
import { Hero, type HealthStatus } from './components/public/Hero'
import { SocialConnect } from './components/public/SocialConnect'
import { SiteNav } from './components/navigation/SiteNav'
import { ContextualBackButton } from './components/navigation/ContextualBackButton'
import { SiteFooter } from './components/navigation/SiteFooter'
import { todayInputValue } from './utils/date'
import { AboutPage, ContactPage, HomeProgrammes, ProgrammesPage, RashtrapatiAwardShowcase } from './pages/PublicPages'
import { PrivacyPolicyPage, TermsOfServicePage } from './pages/LegalPages'
import './App.css'

const newApplication = (applicantName = ''): MembershipApplication => ({ applicant_name: applicantName, member_type: '', date_of_birth: '', gender: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '', parent_or_guardian: '', guardian_type: '', contact_phone: '', postal_code: '', school_college: '', grade_section: '', hobbies: '', introduced_by: '', previous_experience: '', joining_date: todayInputValue(), is_existing_member: false, applicant_signature_upload: '', applicant_signature_name: '', guardian_signature_upload: '', guardian_signature_name: '', photo_upload: '', photo_name: '', fee_acknowledged: false })

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const path = location.pathname
  const isHome = path === '/'
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
  const [healthStatus, setHealthStatus] = useState<HealthStatus>('checking')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [message, setMessage] = useState('')
  const [membership, setMembership] = useState<Membership | null>(null)
  const [membershipResources, setMembershipResources] = useState<MembershipResource[]>([])
  const [membershipResourcesLoading, setMembershipResourcesLoading] = useState(false)
  const [membershipResourcesError, setMembershipResourcesError] = useState('')
  const [showApplication, setShowApplication] = useState(false)
  const [membershipSubmitting, setMembershipSubmitting] = useState(false)
  const [application, setApplication] = useState<MembershipApplication>(newApplication)
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
    const response = await getMyMemberships()
    const currentMembership = response.data.data[0] ?? null
    setMembership(currentMembership)
    setMembershipResources([])
    setMembershipResourcesLoading(false)
    setMembershipResourcesError('')
    if (currentMembership?.status !== 'APPROVED') return
    setMembershipResourcesLoading(true)
    try {
      const resourceResponse = await getMembershipResources()
      setMembershipResources(resourceResponse.data.data)
    } catch {
      setMembershipResourcesError('Member resources could not be loaded. Please try again later.')
    } finally {
      setMembershipResourcesLoading(false)
    }
  }

  useEffect(() => {
    apiClient.get('/health/').then((response) => setHealthStatus(response.data?.success === true ? 'online' : 'offline')).catch(() => setHealthStatus('offline'))
    getEvents().then((response) => setEvents(response.data.data)).catch(() => setEventsError(true)).finally(() => setEventsLoading(false))
    getAnnouncements().then((response) => setAnnouncements(response.data.data)).catch(() => setAnnouncementsError(true)).finally(() => setAnnouncementsLoading(false))
    getGalleryAlbums().then((response) => setGalleryAlbums(response.data.data)).catch(() => setGalleryError(true)).finally(() => setGalleryLoading(false))
    getAchievements().then((response) => setAchievements(response.data.data)).catch(() => setAchievementsError(true)).finally(() => setAchievementsLoading(false))
    if (!localStorage.getItem('scout_access_token')) return
    getCurrentUser().then((response) => {
      setUser(response.data.data)
      setApplication(newApplication(response.data.data.full_name))
      if (response.data.data.is_admin) {
        getAdminDashboard().then((dashboard) => setAdminSummary(dashboard.data.data)).catch(() => undefined)
        getMemberships().then((items) => setAdminApplications(items.data.data)).catch(() => undefined)
        refreshGalleryAlbums().catch(() => undefined)
        refreshAchievements().catch(() => undefined)
        refreshEvents().catch(() => undefined)
        refreshAnnouncements().catch(() => undefined)
      }
      refreshMembership().catch(() => setMembership(null))
    }).catch(() => undefined)
  }, [])

  const completeAuthentication = async (auth: LoginResponse) => {
    try {
      localStorage.setItem('scout_access_token', auth.access)
      localStorage.setItem('scout_refresh_token', auth.refresh)
      setUser(auth.user)
      setApplication(newApplication(auth.user.full_name))
      setShowApplication(false)
      if (auth.user.is_admin) {
        getAdminDashboard().then((dashboard) => setAdminSummary(dashboard.data.data)).catch(() => setMessage('Unable to load the Admin dashboard.'))
        getMemberships().then((items) => setAdminApplications(items.data.data)).catch(() => setMessage('Unable to load membership applications.'))
        refreshGalleryAlbums().catch(() => setMessage('Unable to load gallery management.'))
        refreshAchievements().catch(() => setMessage('Unable to load achievements.'))
        refreshEvents().catch(() => setMessage('Unable to load event management.'))
        refreshAnnouncements().catch(() => setMessage('Unable to load Newsroom management.'))
      }
      await refreshMembership().catch(() => setMembership(null))
      setMessage('Welcome back.')
      navigate(auth.user.is_admin ? '/admin' : '/')
    } catch (error) { setMessage(authErrorMessage(error)) }
  }

  const submitMembership = async (event: FormEvent) => {
    event.preventDefault()
    if (membershipSubmitting) return
    setMembershipSubmitting(true)
    try {
      const { is_existing_member: _isExistingMember, ...applicationPayload } = application
      void _isExistingMember
      const response = await applyForMembership({ ...applicationPayload, member_type: application.member_type as MemberType, joining_date: application.joining_date || null })
      setMembership(response.data.data)
      setMembershipResources([])
      setMembershipResourcesError('')
      setShowApplication(false)
      setApplication(newApplication(user?.full_name ?? ''))
      setMessage('Your membership application is pending Admin approval.')
    } catch (error) { setMessage(authErrorMessage(error)) }
    finally { setMembershipSubmitting(false) }
  }

  const signOut = () => {
    const accessToken = localStorage.getItem('scout_access_token')
    if (accessToken) void logout(accessToken).catch(() => undefined)
    localStorage.removeItem('scout_access_token')
    localStorage.removeItem('scout_refresh_token')
    setUser(null)
    setMembership(null)
    setMembershipResources([])
    setMembershipResourcesLoading(false)
    setMembershipResourcesError('')
    setAdminSummary(null)
    setAdminApplications([])
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
      await refreshMembership().catch(() => setMembership(null))
      return response.data.data
    } catch (error) { setMessage(authErrorMessage(error)); throw error }
  }

  const rejectApplication = async (id: string, reason: string) => {
    try {
      await rejectMembership(id, reason)
      setAdminApplications((current) => current.filter((item) => item.id !== id))
      setAdminSummary((current) => current ? { ...current, pending_applications: current.pending_applications - 1 } : current)
      await refreshMembership().catch(() => setMembership(null))
    } catch (error) {
      setMessage(authErrorMessage(error))
      throw error
    }
  }

  const saveApplication = async (id: string, payload: Partial<Membership>) => {
    try {
      const response = await updateMembership(id, payload)
      setAdminApplications((current) => current.map((item) => item.id === id ? response.data.data : item))
      setMessage('Application corrections saved.')
      return response.data.data
    } catch { setMessage('Unable to save application corrections.') }
  }

  const permanentlyDeleteMembership = async (id: string) => {
    try {
      await deleteMembership(id)
      setAdminApplications((current) => current.filter((item) => item.id !== id))
      const dashboard = await getAdminDashboard()
      setAdminSummary(dashboard.data.data)
      await refreshMembership().catch(() => setMembership(null))
      setMessage('Membership permanently deleted. The website account remains active and can reapply.')
    } catch (error) {
      setMessage(authErrorMessage(error))
      throw error
    }
  }

  const savePendingSignatures = async (id: string, applicantSignature: SignaturePayload | null, guardianSignature: SignaturePayload | null) => {
    const response = await updateMembership(id, {
      ...(applicantSignature ? { applicant_signature_upload: applicantSignature.data, applicant_signature_name: applicantSignature.name } : {}),
      ...(guardianSignature ? { guardian_signature_upload: guardianSignature.data, guardian_signature_name: guardianSignature.name } : {}),
    })
    setMembership(response.data.data)
    setMessage('The required signature information has been saved for Admin review.')
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

  useEffect(() => {
    const clearExpiredSession = () => {
      setUser(null)
      setMembership(null)
      setMembershipResources([])
      setMembershipResourcesLoading(false)
      setMembershipResourcesError('')
      setAdminSummary(null)
      setAdminApplications([])
      setShowApplication(false)
      setMembershipSubmitting(false)
      setApplication(newApplication())
      setMessage('Your session has expired. Please sign in again.')
    }
    window.addEventListener('scout-auth-expired', clearExpiredSession)
    return () => window.removeEventListener('scout-auth-expired', clearExpiredSession)
  }, [])

  const pageContent = path === '/about' ? <AboutPage /> : path === '/programmes' ? <ProgrammesPage /> : path === '/contact' ? <ContactPage /> : path === '/events' ? <EventFeed events={events} loading={eventsLoading} error={eventsError} /> : eventDetailId ? <EventDetails id={eventDetailId} /> : path === '/gallery' ? <GalleryFeed albums={galleryAlbums} loading={galleryLoading} error={galleryError} /> : path === '/achievements' ? <AchievementFeed items={achievements} loading={achievementsLoading} error={achievementsError} /> : path === '/announcements' ? <AnnouncementFeed announcements={announcements} loading={announcementsLoading} error={announcementsError} /> : announcementDetailId ? <AnnouncementDetails id={announcementDetailId} /> : path === '/privacy' ? <PrivacyPolicyPage /> : path === '/terms' ? <TermsOfServicePage /> : null
  const knownAdminRoute = path === '/admin' || isApplicationsAdmin || Boolean(directoryMatch) || isGalleryAdmin || isAchievementsAdmin || isEventsAdmin || isNewsroomAdmin
  const knownPublicRoute = isHome || ['/about', '/programmes', '/contact', '/events', '/gallery', '/achievements', '/announcements', '/join', '/privacy', '/terms'].includes(path) || Boolean(eventDetailId) || Boolean(announcementDetailId)
  const routeNotFound = !knownPublicRoute && !knownAdminRoute

  return <main className="shell">
    <div className="utility"><span>XV KANTEERAVA OPEN UNIT</span><span>Adventure • Service • Community</span></div>
    {!isHome && <SiteNav user={user} internal onSignOut={signOut} />}
    {isHome && <><section className="hero"><SiteNav user={user} onSignOut={signOut} /><Hero status={healthStatus} /></section></>}
    {isHome && <HomeProgrammes />}
    {isHome && <RashtrapatiAwardShowcase />}
    {knownAdminRoute && <section className="admin-hero"><p className="kicker">XVK Scout Group</p><h1>Admin<br /><em>workspace.</em></h1><p>Manage memberships and the work behind the movement.</p></section>}
    {pageContent}
    {user && path === '/join' && <MembershipPanel membership={membership} message={message} applicantEmail={user.email} showApplication={showApplication} application={application} submitting={membershipSubmitting} onOpenApplication={() => { setApplication((current) => ({ ...current, applicant_name: current.applicant_name || user.full_name })); setShowApplication(true) }} onUpdateApplication={(field, value) => setApplication((current) => ({ ...current, [field]: value }))} onSubmitApplication={submitMembership} onSaveSignatures={savePendingSignatures} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} resources={membershipResources} resourcesLoading={membershipResourcesLoading} resourcesError={membershipResourcesError} />}
    {path === '/admin' && user?.is_admin && adminSummary && <AdminPanel summary={adminSummary} message={message} applications={adminApplications} onApprove={approveApplication} onReject={rejectApplication} onUpdate={saveApplication} onDelete={permanentlyDeleteMembership} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} />}
    {isApplicationsAdmin && user?.is_admin && adminSummary && <AdminWorkspacePage label="Membership Applications" title="Membership Applications" description="Review and manage new membership requests."><AdminPanel view="applications" summary={adminSummary} message={message} applications={adminApplications} onApprove={approveApplication} onReject={rejectApplication} onUpdate={saveApplication} onDelete={permanentlyDeleteMembership} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} /></AdminWorkspacePage>}
    {directoryMatch && user?.is_admin && <AdminWorkspacePage label="Member Directory" keepChildHeading><MemberDirectory key={path} wing={directoryWing} memberId={directoryMemberId} onDelete={permanentlyDeleteMembership} onView={(id) => openMembershipForm(id)} onDownload={(id) => openMembershipForm(id, true)} /></AdminWorkspacePage>}
    {isGalleryAdmin && user?.is_admin && <AdminWorkspacePage label="Gallery" title="Gallery" description="Create albums, upload photos, edit albums and manage gallery content."><GalleryAdminPanel albums={galleryAlbums} events={events} onRefreshAlbums={refreshGalleryAlbums} /></AdminWorkspacePage>}
    {isAchievementsAdmin && user?.is_admin && <AdminWorkspacePage label="Achievements" title="Achievements" description="Add, edit and manage group achievements and recognitions."><AchievementAdminPanel items={achievements} onRefresh={refreshAchievements} /></AdminWorkspacePage>}
    {isEventsAdmin && user?.is_admin && <AdminWorkspacePage label="Events" title="Events" description="Create, publish and manage upcoming and past events."><EventAdminPanel events={events} onRefresh={refreshEvents} /></AdminWorkspacePage>}
    {isNewsroomAdmin && user?.is_admin && <AdminWorkspacePage label="Newsroom" title="Newsroom" description="Create and manage notices, updates, reports and stories."><AnnouncementAdminPanel posts={announcements} onRefresh={refreshAnnouncements} /></AdminWorkspacePage>}
    {((path === '/join' || knownAdminRoute) && !user) && <AuthPanel onAuthenticated={completeAuthentication} adminOnly={knownAdminRoute} />}
    {knownAdminRoute && user && !user.is_admin && <section className="route-message"><h2>Admin access required.</h2><p>This account does not have permission to access the workspace.</p></section>}
    {knownAdminRoute && user?.is_admin && !adminSummary && <section className="route-message"><h2>Loading Admin workspace.</h2><p>{message || 'Retrieving the latest dashboard information.'}</p></section>}
    {routeNotFound && <section className="route-message"><h2>Page not found.</h2><p>The page you requested does not exist.</p></section>}
    {isHome && <SocialConnect />}
    <ContextualBackButton />
    <SiteFooter />
  </main>
}

function authErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return 'Unable to complete your request. Please try again.'
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 'The request timed out. Please try again.'
    }
    return 'Unable to connect to the server. Please try again.'
  }

  const { status, data } = error.response

  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const responseData = data as {
      message?: string
      detail?: string
    } & Record<string, unknown>

    if (typeof responseData.message === 'string') return responseData.message
    if (typeof responseData.detail === 'string') return responseData.detail

    const [field, messages] = Object.entries(responseData)[0] ?? []

    if (field && messages) {
      const message = Array.isArray(messages) ? messages.join(' ') : String(messages)
      return `${field.replaceAll('_', ' ')}: ${message}`
    }
  }

  if (status === 401) {
    return 'Your session has expired. Please sign in again.'
  }

  if (status === 403) {
    return "You don't have permission to perform this action."
  }

  if (status === 429) {
    return 'Too many attempts. Please try again later.'
  }

  if ([500, 502, 503, 504].includes(status)) {
    return 'Service is temporarily unavailable. Please try again later.'
  }

  return 'Unable to complete your request. Please try again.'
}
// function authErrorMessage(error: unknown): string {
//   if (!isAxiosError(error) || !error.response?.data) return 'Unable to connect to the server. Please try again.'

//   const data = error.response.data
//   if (typeof data !== 'object' || data === null || Array.isArray(data)) {
//     return 'Unable to complete your request. Please try again.'
//   }
//   if (typeof data.message === 'string') return data.message
//   if (typeof data.detail === 'string') return data.detail

//   const [field, messages] = Object.entries(data)[0] ?? []
//   if (field && messages) {
//     const message = Array.isArray(messages) ? messages.join(' ') : String(messages)
//     return `${field.replaceAll('_', ' ')}: ${message}`
//   }
//   return 'Unable to complete your request. Please check the form and try again.'
// }

export default App
