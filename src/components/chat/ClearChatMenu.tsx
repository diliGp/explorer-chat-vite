import { useState, useRef, useEffect } from 'react';

interface ClearChatMenuProps {
    onClearChat: () => Promise<void>;
}

export function ClearChatMenu({ onClearChat }: ClearChatMenuProps) {
    const [open, setOpen] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [clearing, setClearing] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close confirmation on Escape
    useEffect(() => {
        if (!confirming) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setConfirming(false);
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [confirming]);

    const handleClearClick = () => {
        setOpen(false);
        setConfirming(true);
    };

    const handleConfirm = async () => {
        setClearing(true);
        try {
            await onClearChat();
        } finally {
            setClearing(false);
            setConfirming(false);
        }
    };

    return (
        <>
            {/* Kebab button + dropdown */}
            <div className="relative" ref={menuRef}>
                <button
                    aria-label="Chat options"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-muted)]"
                >
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <circle cx="12" cy="5" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="12" cy="19" r="1.5" />
                    </svg>
                </button>

                {open && (
                    <div
                        role="menu"
                        className="absolute right-0 top-9 z-50 min-w-[160px] rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-lg py-1"
                    >
                        <button
                            role="menuitem"
                            onClick={handleClearClick}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-[var(--bg-elevated)] transition-colors"
                        >
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                aria-hidden="true"
                            >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                            </svg>
                            Clear chat
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation modal */}
            {confirming && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setConfirming(false);
                    }}
                >
                    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-xl p-6 w-full max-w-sm">
                        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                            Clear chat for both?
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mb-5">
                            This permanently deletes all messages for you and the other person. It
                            cannot be undone.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setConfirming(false)}
                                disabled={clearing}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors disabled:opacity-40"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={clearing}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center gap-2"
                            >
                                {clearing && (
                                    <svg
                                        className="animate-spin"
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeOpacity="0.3"
                                        />
                                        <path
                                            d="M12 2a10 10 0 0110 10"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                )}
                                {clearing ? 'Clearing…' : 'Clear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
