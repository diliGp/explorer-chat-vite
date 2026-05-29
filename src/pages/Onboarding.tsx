import { Link } from 'react-router-dom';
import { ProfileForm } from '@/components/onboarding/ProfileForm';
import { AdSlot } from '@/components/layout/AdSlot';

export default function OnboardingPage() {
    return (
        <div className="h-dvh bg-[var(--bg-primary)] flex flex-col overflow-hidden">
            {/* Mobile layout */}
            <div className="flex flex-col h-full lg:hidden">
                <div className="flex-shrink-0 flex justify-center py-2 border-b border-[var(--border)]">
                    <AdSlot
                        id="onboarding-top-mobile"
                        width={320}
                        height={50}
                        className="max-w-full"
                    />
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="w-full max-w-md mx-auto">
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                                C
                            </div>
                            <h1 className="text-xl font-bold text-[var(--text-primary)]">
                                Welcome to ChatApp
                            </h1>
                            <p className="text-sm text-[var(--text-muted)] mt-1">
                                Create a free profile to start chatting with people around the
                                world.
                            </p>
                        </div>
                        <div className="bg-[var(--bg-surface)] rounded-2xl p-5 shadow-sm">
                            <ProfileForm />
                        </div>
                        <p className="text-center text-xs text-[var(--text-muted)] mt-4">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-[var(--accent)] hover:underline font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0 flex justify-center py-2 border-t border-[var(--border)]">
                    <AdSlot id="onboarding-bottom-mobile" width={320} height={50} />
                </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden lg:flex h-full overflow-hidden">
                <div className="flex-shrink-0 flex items-center justify-center px-4 w-44">
                    <AdSlot id="onboarding-left-rail" width={160} height={600} />
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-8">
                    <div className="w-full max-w-md mx-auto">
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 bg-[var(--accent)] rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                                C
                            </div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                                Welcome to ChatApp
                            </h1>
                            <p className="text-sm text-[var(--text-muted)] mt-2">
                                Create a free profile to start chatting with people around the
                                world.
                            </p>
                        </div>
                        <div className="bg-[var(--bg-surface)] rounded-2xl p-6 shadow-sm">
                            <ProfileForm />
                        </div>
                        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="text-[var(--accent)] hover:underline font-medium"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
                <div className="flex-shrink-0 flex items-center justify-center px-4 w-44">
                    <AdSlot id="onboarding-right-rail" width={160} height={600} />
                </div>
            </div>
        </div>
    );
}
