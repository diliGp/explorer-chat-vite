import { useEffect, useRef } from 'react';
import type { Message, ReplyTo } from '@/types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { format, isToday, isYesterday } from 'date-fns';

interface MessageListProps {
    messages: Message[];
    currentUid: string;
    typingNames: string[];
    onReply: (replyTo: ReplyTo) => void;
    onReport: (msgId: string) => void;
    onViewImage: (message: Message) => Promise<string | null>;
    loading: boolean;
    /** Timestamp the OTHER participant last read (for blue tick read receipts) */
    otherReadAt?: number;
    /** True when an older page of history is available to fetch */
    hasMore?: boolean;
    /** True while a "load older" fetch is in flight */
    loadingOlder?: boolean;
    /** Fetches the next page of older history */
    onLoadOlder?: () => void;
}

function DateDivider({ date }: { date: Date }) {
    let label: string;
    if (isToday(date)) label = 'Today';
    else if (isYesterday(date)) label = 'Yesterday';
    else label = format(date, 'MMMM d, yyyy');

    return (
        <div className="flex items-center gap-3 px-4 py-3" aria-label={`Messages from ${label}`}>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--text-muted)] font-medium">{label}</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
        </div>
    );
}

export function MessageList({
    messages,
    currentUid,
    typingNames,
    onReply,
    onReport,
    onViewImage,
    loading,
    otherReadAt,
    hasMore = false,
    loadingOlder = false,
    onLoadOlder,
}: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevLastIdRef = useRef<string | null>(null);

    // Auto-scroll only when a new message is appended at the tail — prepending an
    // older page (via "Load earlier") changes messages.length too, but the last
    // (most recent) id stays the same, so it must not yank the view to the bottom.
    useEffect(() => {
        const lastId = messages.length > 0 ? messages[messages.length - 1].id : null;
        if (lastId !== null && lastId !== prevLastIdRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevLastIdRef.current = lastId;
    }, [messages]);

    // Group messages by date
    const groups: { date: Date; messages: Message[] }[] = [];
    for (const msg of messages) {
        const msgDate = new Date(msg.createdAt);
        const last = groups[groups.length - 1];
        if (!last || !isSameDay(last.date, msgDate)) {
            groups.push({ date: msgDate, messages: [msg] });
        } else {
            last.messages.push(msg);
        }
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div
                    className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"
                    aria-label="Loading messages"
                />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-surface)] flex items-center justify-center mb-4">
                    <svg
                        width="28"
                        height="28"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="text-[var(--text-muted)]"
                    >
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-[var(--text-primary)]">No messages yet</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                    Send a message to get the conversation started!
                </p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto py-2"
            role="log"
            aria-label="Chat messages"
            aria-live="polite"
            aria-relevant="additions"
        >
            {hasMore && (
                <div className="flex justify-center py-2">
                    <button
                        onClick={onLoadOlder}
                        disabled={loadingOlder}
                        className="text-xs font-medium text-[var(--accent)] hover:underline disabled:opacity-50 px-3 py-1.5"
                    >
                        {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                    </button>
                </div>
            )}
            {groups.map((group, gi) => (
                <div key={gi}>
                    <DateDivider date={group.date} />
                    {group.messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            message={msg}
                            isSelf={msg.senderId === currentUid}
                            onReply={onReply}
                            onReport={onReport}
                            onViewImage={onViewImage}
                            otherReadAt={otherReadAt}
                        />
                    ))}
                </div>
            ))}

            <TypingIndicator names={typingNames} />

            <div ref={bottomRef} aria-hidden="true" />
        </div>
    );
}

function isSameDay(a: Date, b: Date): boolean {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}
