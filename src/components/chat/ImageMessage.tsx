import { useState } from 'react';
import type { Message } from '@/types';

interface ImageMessageProps {
    message: Message;
    isSelf: boolean;
    onView: (message: Message) => Promise<string | null>;
}

export function ImageMessage({ message, isSelf, onView }: ImageMessageProps) {
    const [viewing, setViewing] = useState(false);
    const [viewUrl, setViewUrl] = useState<string | null>(null);
    const [expired, setExpired] = useState(false);

    const handleTap = async () => {
        if (isSelf || message.mediaViewed || expired) return;
        setViewing(true);
        const url = await onView(message);
        if (url) {
            setViewUrl(url);
            // Auto-expire after 30 seconds
            setTimeout(() => {
                setViewUrl(null);
                setExpired(true);
            }, 30_000);
        } else {
            setExpired(true);
        }
        setViewing(false);
    };

    if (message.deletedAt) {
        return <div className="text-xs text-[var(--text-muted)] italic">Image deleted</div>;
    }

    // Sender sees thumbnail (no tap needed)
    if (isSelf) {
        return (
            <div className="relative rounded-xl overflow-hidden max-w-[220px]">
                {message.mediaThumbnail ? (
                    <img
                        src={message.mediaThumbnail}
                        alt="Sent image"
                        className="w-full object-cover"
                        style={{ maxHeight: 200 }}
                    />
                ) : (
                    <div className="w-44 h-32 bg-[var(--bg-elevated)] flex items-center justify-center text-xs text-[var(--text-muted)]">
                        Uploading...
                    </div>
                )}
                <div className="absolute bottom-1 right-2 text-[10px] text-white/80 bg-black/30 rounded px-1">
                    Tap to view · disappears after seen
                </div>
            </div>
        );
    }

    // Receiver — show blurred until tapped
    if (viewUrl) {
        return (
            <div className="relative rounded-xl overflow-hidden max-w-[220px]">
                <img
                    src={viewUrl}
                    alt="Received image"
                    className="w-full object-cover animate-fade-in"
                    style={{ maxHeight: 300 }}
                />
                <div className="absolute bottom-1 right-2 text-[10px] text-white/80 bg-black/30 rounded px-1">
                    Expires in 30s
                </div>
            </div>
        );
    }

    if (expired || (message.mediaViewed && !viewUrl)) {
        return (
            <div className="w-44 h-28 bg-[var(--bg-elevated)] rounded-xl flex flex-col items-center justify-center gap-1">
                <svg
                    width="24"
                    height="24"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="text-[var(--text-muted)]"
                >
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" />
                </svg>
                <span className="text-xs text-[var(--text-muted)]">Image expired</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleTap}
            disabled={viewing}
            className="relative rounded-xl overflow-hidden max-w-[220px] cursor-pointer group"
            aria-label="Tap to view image (disappears after viewing)"
        >
            {message.mediaThumbnail ? (
                <img
                    src={message.mediaThumbnail}
                    alt="Tap to reveal"
                    className="w-full object-cover image-blur"
                    style={{ maxHeight: 200 }}
                />
            ) : (
                <div className="w-44 h-32 bg-[var(--bg-elevated)]" />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/20">
                {viewing ? (
                    <div className="w-6 h-6 border-2 border-white rounded-full border-t-transparent animate-spin" />
                ) : (
                    <>
                        <svg
                            width="28"
                            height="28"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="white"
                            strokeWidth={1.5}
                        >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                        <span className="text-xs text-white font-medium">Tap to view</span>
                        <span className="text-[10px] text-white/70">Disappears after viewing</span>
                    </>
                )}
            </div>
        </button>
    );
}
