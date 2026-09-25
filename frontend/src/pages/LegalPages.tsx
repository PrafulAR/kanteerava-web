import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const LAST_UPDATED = '25 September 2026'
const CONTACT_EMAIL = 'kanteeravascoutsnguides@gmail.com'

type LegalPageProps = {
  eyebrow: string
  title: string
  introduction: string
  children: ReactNode
}

function LegalPage({ eyebrow, title, introduction, children }: LegalPageProps) {
  return (
    <div className="legal-page">
      <header className="legal-hero">
        <div>
          <p className="kicker">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <div className="legal-hero-copy">
          <p>{introduction}</p>
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>
          <Link className="legal-home-link" to="/">
            <span aria-hidden="true">←</span> Return to home
          </Link>
        </div>
      </header>

      <article className="legal-content">{children}</article>
    </div>
  )
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage
      eyebrow="Your information"
      title="Privacy Policy"
      introduction="This policy explains how Kanteerava Open Scouts and Guides Group handles information when you use our website, sign in, contact us, or apply for membership."
    >
      <section className="legal-section">
        <h2>Information we may collect</h2>
        <div className="legal-section-copy">
          <p>
            We may collect account details such as your name, email address, phone number, and securely
            processed login credentials. We also receive information that you choose to provide through
            forms, enquiries, registrations, and membership applications.
          </p>
          <p>
            Membership applications may include contact, address, age, education, Scouting or Guiding,
            emergency-contact, guardian, photograph, and signature information. A parent or guardian
            should provide or approve information for a child where required.
          </p>
          <p>
            Our systems may also process basic technical information needed for security and reliable
            operation, such as session, browser, request, and authentication information.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Google Sign-In</h2>
        <div className="legal-section-copy">
          <p>
            If you choose Google Sign-In, Google provides basic account information used to authenticate
            you, such as your email address, display name, verified-email status, and a stable Google
            account identifier.
          </p>
          <p>
            We use this information only to create, identify, link, and help recover your Kanteerava
            account. We do not receive your Google password or request access to your Gmail, Google Drive,
            or contacts through this sign-in process.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>How information is used</h2>
        <div className="legal-section-copy">
          <p>We use information where reasonably necessary to:</p>
          <ul>
            <li>provide and protect website accounts and authentication;</li>
            <li>receive, review, and administer membership applications;</li>
            <li>manage registrations, enquiries, and relevant communications;</li>
            <li>operate public content and approved-member or administrative features; and</li>
            <li>prevent misuse, resolve problems, and maintain the security of the service.</li>
          </ul>
          <p>Google Sign-In information is not sold or used by Kanteerava for advertising.</p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Third-party services</h2>
        <div className="legal-section-copy">
          <p>
            The website may use selected service providers for authentication, hosting, database storage,
            uploaded media, and transactional email. These may include Google, Vercel, Render, MongoDB
            Atlas, Cloudinary, and Brevo when their respective services are enabled.
          </p>
          <p>
            Information is shared with these providers only as needed to operate the relevant feature.
            Their handling of information is also governed by their own privacy and security terms.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Security and retention</h2>
        <div className="legal-section-copy">
          <p>
            We use reasonable technical and organisational safeguards to protect information. However,
            no internet service or storage system can guarantee absolute security.
          </p>
          <p>
            Information is retained only for as long as reasonably needed for the purposes described
            here, including membership administration, account security, record-keeping, dispute
            resolution, and applicable legal obligations.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Your choices and privacy questions</h2>
        <div className="legal-section-copy">
          <p>
            You may contact us to ask about personal information associated with your account or
            application, or to request an appropriate correction or deletion. Some records may need to
            be retained for legitimate administrative or legal reasons.
          </p>
          <p className="legal-contact">
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Changes to this policy</h2>
        <div className="legal-section-copy">
          <p>
            We may update this policy as the website or our practices change. The current version and
            its latest revision date will remain available on this page.
          </p>
        </div>
      </section>
    </LegalPage>
  )
}

export function TermsOfServicePage() {
  return (
    <LegalPage
      eyebrow="Using this website"
      title="Terms of Service"
      introduction="These terms describe the conditions for using the Kanteerava Open Scouts and Guides Group website and its account, membership, and information services."
    >
      <section className="legal-section">
        <h2>Acceptance of terms</h2>
        <div className="legal-section-copy">
          <p>
            By accessing or using this website, you agree to these Terms of Service and our{' '}
            <Link to="/privacy">Privacy Policy</Link>. If you do not agree, please do not use
            account-based or application features.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Appropriate use</h2>
        <div className="legal-section-copy">
          <p>You agree to use the website lawfully and respectfully. You must not:</p>
          <ul>
            <li>impersonate another person or provide deliberately false information;</li>
            <li>attempt to access another user's account or restricted administrative features;</li>
            <li>upload malicious, unlawful, or harmful material; or</li>
            <li>interfere with the website's operation, security, or availability.</li>
          </ul>
        </div>
      </section>

      <section className="legal-section">
        <h2>User accounts</h2>
        <div className="legal-section-copy">
          <p>
            You are responsible for providing accurate account information, safeguarding access to your
            account, and notifying us if you believe it has been used without permission. Signing in
            with Google verifies identity information but does not automatically grant membership,
            staff, or administrative status.
          </p>
          <p>
            We may restrict account access where reasonably necessary to protect users, enforce these
            terms, or maintain the security of the website.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Membership applications</h2>
        <div className="legal-section-copy">
          <p>
            Membership and related application information must be complete, accurate, and submitted by
            an authorised person. Applications are reviewed through Kanteerava's established process;
            creating an account or submitting an application does not guarantee approval.
          </p>
          <p>
            Membership status, access to member resources, and administrative decisions remain separate
            from ordinary website authentication.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Website content</h2>
        <div className="legal-section-copy">
          <p>
            Unless otherwise stated, the website's text, photographs, branding, documents, and other
            materials are provided for personal and informational use. They may not be copied,
            republished, misrepresented, or commercially reused without appropriate permission.
          </p>
          <p>
            Event, programme, and organisational information may change. Please confirm time-sensitive
            details through the contact information provided on the website.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Third-party services and links</h2>
        <div className="legal-section-copy">
          <p>
            Some features rely on third-party services, including authentication, hosting, email, and
            media delivery. External websites and services operate under their own terms and policies,
            and Kanteerava is not responsible for content or practices outside its control.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Availability and responsibility</h2>
        <div className="legal-section-copy">
          <p>
            We take reasonable care in operating the website, but cannot promise that it will always be
            uninterrupted, error-free, or available. To the extent permitted by applicable law,
            Kanteerava is not responsible for indirect loss caused by reliance on unavailable,
            incomplete, or outdated website information.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Changes to these terms</h2>
        <div className="legal-section-copy">
          <p>
            We may update these terms when the website, services, or applicable requirements change.
            The latest version and revision date will be published on this page. Any updated terms will
            be published on this page with the latest revision date.
          </p>
        </div>
      </section>

      <section className="legal-section">
        <h2>Contact</h2>
        <div className="legal-section-copy">
          <p>For questions about these terms, contact:</p>
          <p className="legal-contact">
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </section>
    </LegalPage>
  )
}
