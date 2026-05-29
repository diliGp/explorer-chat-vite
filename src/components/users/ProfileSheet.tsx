import { useEffect, useState } from 'react';
import type { OnlineUser } from '@/types';
import { UserAvatar } from './UserAvatar';
import { getCountry } from '@/lib/utils/countries';
import { useAppStore } from '@/store';
import { blockUser, unblockUser } from '@/lib/firebase/auth';
import { getDmId } from '@/lib/firebase/firestore';

interface ProfileSheetProps {
    user: OnlineUser;
    onClose: () => void;
    onStartChat: () => void;
    /** Pass the active dmId if we're already in a DM — needed to stamp blockedBy on DM doc */
    dmId?: string;
}

const GENDER_LABELS = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
};

export function ProfileSheet({ user, onClose, onStartChat, dmId }: ProfileSheetProps) {
    const { currentUser, setCurrentUser } = useAppStore();
    const [blocking, setBlocking] = useState(false);

    const blockedUsers: string[] = currentUser?.blockedUsers ?? [];
    const isBlocked = blockedUsers.includes(user.uid);
    const country = getCountry(user.country);

    // Compute dmId if not provided (sidebar usage)
    const resolvedDmId = dmId ?? (currentUser ? getDmId(currentUser.uid, user.uid) : null);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleBlock = async () => {
        if (!currentUser || blocking) return;
        setBlocking(true);
        try {
            if (isBlocked) {
                await unblockUser(currentUser.uid, user.uid, resolvedDmId ?? null);
                setCurrentUser({
                    ...currentUser,
                    blockedUsers: blockedUsers.filter((u) => u !== user.uid),
                });
            } else {
                await blockUser(currentUser.uid, user.uid, resolvedDmId ?? null);
                setCurrentUser({
                    ...currentUser,
                    blockedUsers: [...blockedUsers, user.uid],
                });
                onClose();
            }
        } finally {
            setBlocking(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-sheet-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full sm:max-w-sm bg-[var(--bg-primary)] rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up p-6 pb-safe">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] transition-colors"
                    aria-label="Close profile"
                >
                    <svg
                        width="16"
                        height="16"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>

                {/* Header */}
                <div className="flex flex-col items-center gap-3 mb-6">
                    <UserAvatar
                        name={user.name}
                        gender={user.gender}
                        country={user.country}
                        isOnline={user.isOnline}
                        size="lg"
                        avatarUrl={user.avatarUrl}
                    />
                    <div className="text-center">
                        <h2
                            id="profile-sheet-title"
                            className="text-xl font-bold text-[var(--text-primary)]"
                        >
                            {user.name}
                        </h2>
                        <p className="text-sm text-[var(--text-muted)]">
                            {country?.flag} {country?.name}
                            {user.city ? ` · ${user.city}` : ''}
                        </p>
                    </div>
                    {user.bio && (
                        <p className="text-sm text-center text-[var(--text-secondary)] px-2 leading-relaxed">
                            {user.bio}
                        </p>
                    )}
                </div>

                {/* Details */}
                <dl className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-[var(--bg-surface)] rounded-xl p-3">
                        <dt className="text-xs text-[var(--text-muted)] mb-1">Gender</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)]">
                            {GENDER_LABELS[user.gender]}
                        </dd>
                    </div>
                    <div className="bg-[var(--bg-surface)] rounded-xl p-3">
                        <dt className="text-xs text-[var(--text-muted)] mb-1">Status</dt>
                        <dd className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-1.5">
                            <span
                                className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`}
                                aria-hidden="true"
                            />
                            {user.isOnline ? 'Online' : 'Offline'}
                        </dd>
                    </div>
                </dl>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    {!isBlocked ? (
                        <button
                            onClick={onStartChat}
                            className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
                        >
                            Send Message
                        </button>
                    ) : (
                        <div className="w-full py-3 px-4 rounded-xl text-center text-sm text-[var(--text-muted)] bg-[var(--bg-surface)]">
                            User blocked — messages are hidden
                        </div>
                    )}

                    <button
                        onClick={handleBlock}
                        disabled={blocking}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-[var(--danger)] hover:bg-[var(--bg-surface)] transition-colors disabled:opacity-50"
                        aria-label={isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`}
                    >
                        {blocking ? '...' : isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                </div>
            </div>
        </div>
    );
}
