import { Link } from 'react-router-dom';

export default function TermsPage() {
    const lastUpdated = 'May 27, 2026';

    return (
        <div className="min-h-dvh bg-[var(--bg-primary)] py-12 px-4">
            <article className="max-w-2xl mx-auto" aria-label="Terms of Service">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)] hover:underline mb-8"
                >
                    <svg
                        width="14"
                        height="14"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                    Back to ChatApp
                </Link>

                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                    Terms of Service
                </h1>
                <p className="text-sm text-[var(--text-muted)] mb-8">Last updated: {lastUpdated}</p>

                <div className="prose prose-sm max-w-none text-[var(--text-secondary)] space-y-8">
                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            1. Acceptance of Terms
                        </h2>
                        <p>
                            By accessing or using ChatApp, you agree to be bound by these Terms of
                            Service and our Privacy Policy. If you do not agree, you may not use the
                            service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            2. Eligibility
                        </h2>
                        <p>
                            You must be at least 13 years old (16 years old if located in the
                            European Union) to use ChatApp. By creating a profile, you represent and
                            warrant that you meet the applicable age requirement.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            3. Prohibited Content &amp; Conduct
                        </h2>
                        <p>You agree not to use ChatApp to:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>
                                Transmit, solicit, or produce child sexual abuse material (CSAM) —{' '}
                                <strong>zero tolerance, immediately reported to NCMEC</strong>
                            </li>
                            <li>Harass, bully, threaten, or intimidate other users</li>
                            <li>
                                Dox, stalk, or share another person's private information without
                                consent
                            </li>
                            <li>Send unsolicited commercial messages (spam)</li>
                            <li>Impersonate any person or entity</li>
                            <li>Distribute malware, phishing links, or harmful code</li>
                            <li>Engage in any illegal activity</li>
                            <li>Circumvent age verification or moderation systems</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            4. User-Generated Content
                        </h2>
                        <p>
                            You retain ownership of content you create. By sending content on
                            ChatApp, you grant us a limited, non-exclusive license to store and
                            transmit that content for the purpose of providing the service. We do
                            not claim ownership of your messages.
                        </p>
                        <p className="mt-2">
                            You are solely responsible for the content you send. ChatApp is not
                            responsible for user-generated content but reserves the right to remove
                            any content that violates these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            5. View-Once Images
                        </h2>
                        <p>
                            ChatApp attempts to delete images after they are viewed by the
                            recipient. We make no guarantee that images cannot be saved,
                            screenshotted, or otherwise captured by recipients or third parties.
                            <strong>
                                {' '}
                                Do not send images you would not want permanently saved.
                            </strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            6. Moderation &amp; Account Termination
                        </h2>
                        <p>
                            We reserve the right to remove content, suspend, or permanently ban any
                            user account at our sole discretion, including for violations of these
                            Terms or for conduct we deem harmful to the community, without prior
                            notice. Banned users may not create new accounts.
                        </p>
                        <p className="mt-2">
                            Users may report messages using the in-app report function. Reports are
                            reviewed by our moderation team. Repeated reports against a user may
                            result in suspension.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            7. Anonymous Accounts
                        </h2>
                        <p>
                            Guest (anonymous) accounts and their associated data are automatically
                            deleted after 30 days of inactivity. We encourage users to register a
                            permanent account to preserve chat history.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            8. Disclaimer of Warranties
                        </h2>
                        <p>
                            ChatApp is provided "as is" without warranties of any kind, express or
                            implied. We do not warrant that the service will be uninterrupted,
                            error-free, or free of viruses. We are not responsible for the content
                            of messages sent between users.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            9. Limitation of Liability
                        </h2>
                        <p>
                            To the maximum extent permitted by law, ChatApp and its operators shall
                            not be liable for any indirect, incidental, special, consequential, or
                            punitive damages arising from your use of the service, including but not
                            limited to damages for lost data, lost profits, or personal injury.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            10. Governing Law
                        </h2>
                        <p>
                            These Terms are governed by the laws of the State of California, United
                            States, without regard to its conflict of law principles. Any disputes
                            shall be resolved in the courts located in San Francisco County,
                            California.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            11. Changes to Terms
                        </h2>
                        <p>
                            We reserve the right to update these Terms at any time. We will provide
                            at least 14 days' notice before material changes take effect. Continued
                            use of ChatApp after the effective date constitutes acceptance of the
                            revised Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
                            12. Contact
                        </h2>
                        <p>
                            Legal inquiries:{' '}
                            <a
                                href="mailto:legal@chatapp.example.com"
                                className="text-[var(--accent)] hover:underline"
                            >
                                legal@chatapp.example.com
                            </a>
                        </p>
                    </section>
                </div>
            </article>
        </div>
    );
}
