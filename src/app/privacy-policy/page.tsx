import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — ChatApp',
  description: 'How ChatApp collects, uses, and protects your personal data.',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = 'May 27, 2026'

  return (
    <div className="min-h-dvh bg-[var(--bg-primary)] py-12 px-4">
      <article className="max-w-2xl mx-auto" aria-label="Privacy Policy">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mb-8">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 18l-6-6 6-6"/></svg>
          Back to ChatApp
        </Link>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-sm max-w-none text-[var(--text-secondary)] space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Who We Are</h2>
            <p>
              ChatApp ("we", "our", "us") is an online chat service. This Privacy Policy explains how we collect,
              use, disclose, and protect information when you use our platform.
            </p>
            <p className="mt-2">
              Data controller contact: <a href="mailto:privacy@chatapp.example.com" className="text-[var(--accent)] hover:underline">privacy@chatapp.example.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Age Restrictions</h2>
            <p>
              ChatApp is not intended for children under 13 years of age (or 16 years of age in the European Union,
              per GDPR Article 8). By creating a profile, you confirm that you meet the minimum age requirement
              for your jurisdiction. We record your date of birth and the timestamp of your consent.
            </p>
            <p className="mt-2">
              If we discover that a user is under the applicable minimum age, we will promptly delete their account
              and all associated data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Information We Collect</h2>
            <h3 className="font-medium text-[var(--text-primary)] mb-2">Information you provide:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Display name</li>
              <li>Date of birth (used to verify age; stored as computed age)</li>
              <li>Gender (optional categories)</li>
              <li>Country and city</li>
              <li>Email address and password (for registered accounts only)</li>
              <li>Chat messages, images, and GIFs you send</li>
            </ul>
            <h3 className="font-medium text-[var(--text-primary)] mt-4 mb-2">Information collected automatically:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address and approximate location</li>
              <li>Browser type and device information</li>
              <li>Connection timestamps and session duration</li>
              <li>Crash reports and performance data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide the chat service and maintain your profile</li>
              <li>To verify minimum age requirements</li>
              <li>To enforce our Terms of Service and moderate content</li>
              <li>To display your online status and presence to other users</li>
              <li>To prevent fraud, spam, and abuse</li>
              <li>To improve the platform (aggregated, anonymized analytics only)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Image Expiry ("View Once")</h2>
            <p>
              When you send an image marked as "view once," we attempt to delete the image from our servers
              after the recipient views it (or after 24 hours, whichever comes first). <strong>However, we cannot
              prevent recipients from taking screenshots or using other methods to save the image.</strong> Do not
              send images you would not want saved.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Anonymous (guest) accounts:</strong> Profile and messages are deleted after 30 days of inactivity.</li>
              <li><strong>Registered accounts:</strong> Retained until you request deletion.</li>
              <li><strong>View-once images:</strong> Deleted from storage after viewing or within 24 hours.</li>
              <li><strong>Regular images and GIFs:</strong> Retained for the duration of the conversation or until the conversation is deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Data Sharing</h2>
            <p>We do <strong>not</strong> sell your personal data. We share data only with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Firebase / Google Cloud</strong> — our infrastructure provider (hosting, database, storage, authentication)</li>
              <li><strong>Tenor / Google</strong> — GIF search results (your search queries may be sent to Tenor)</li>
              <li><strong>Law enforcement</strong> — if required by valid legal process</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Cookies &amp; Local Storage</h2>
            <p>
              We use <code>localStorage</code> to store your theme preference and authentication state.
              We do not use third-party advertising cookies at this time. When advertising is enabled,
              a cookie consent banner will be displayed before any tracking cookies are set.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">9. Your Rights (GDPR / CCPA)</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access</strong> — request a copy of your personal data</li>
              <li><strong>Rectification</strong> — correct inaccurate data</li>
              <li><strong>Erasure</strong> — request deletion of your account and data</li>
              <li><strong>Portability</strong> — receive your data in a machine-readable format</li>
              <li><strong>Restriction</strong> — limit processing of your data</li>
              <li><strong>Object</strong> — opt out of certain processing</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email <a href="mailto:privacy@chatapp.example.com" className="text-[var(--accent)] hover:underline">privacy@chatapp.example.com</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">10. Security</h2>
            <p>
              We use industry-standard security measures including TLS encryption in transit, Firebase
              Security Rules for data access control, and bcrypt-hashed passwords for registered accounts.
              No system is 100% secure — please choose a strong password and do not share your credentials.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users by email
              and display a banner on the site. Continued use after the effective date constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">12. Contact</h2>
            <p>
              Questions about this policy:{' '}
              <a href="mailto:privacy@chatapp.example.com" className="text-[var(--accent)] hover:underline">
                privacy@chatapp.example.com
              </a>
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}
