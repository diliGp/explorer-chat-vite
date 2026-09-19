import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store';
import { useReportedMessages } from '@/lib/hooks/useReportedMessages';
import { dismissReport, deleteReportedMessage } from '@/lib/firebase/moderation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import type { Message } from '@/types';

function messagePreview(message: Message): string {
    if (message.deletedAt) return '(message deleted)';
    switch (message.type) {
        case 'text':
            return message.text ?? '';
        case 'gif':
            return '🎬 GIF';
        case 'image':
            return '📷 Image';
        default:
            return '';
    }
}

function ReportedMessageRow({ message }: { message: Message }) {
    const [busy, setBusy] = useState<'dismiss' | 'delete' | null>(null);
    const reporterCount = message.reportedBy?.length ?? 0;

    const handleDismiss = async () => {
        setBusy('dismiss');
        try {
            await dismissReport(message.dmId, message.id);
            toast.success('Report dismissed.');
        } catch (err) {
            console.error('[AdminReports] dismiss failed:', err);
            toast.error('Failed to dismiss report.');
        } finally {
            setBusy(null);
        }
    };

    const handleDelete = async () => {
        setBusy('delete');
        try {
            await deleteReportedMessage(message.dmId, message.id);
            toast.success('Message deleted.');
        } catch (err) {
            console.error('[AdminReports] delete failed:', err);
            toast.error('Failed to delete message.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="border border-[var(--border)] rounded-xl p-4 flex flex-col gap-3 bg-[var(--bg-surface)]">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                        {message.senderName}{' '}
                        <span className="font-normal text-[var(--text-muted)]">
                            ({message.senderId})
                        </span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                        {format(new Date(message.createdAt), 'MMM d, yyyy · h:mm a')} · DM{' '}
                        <Link to={`/dm/${message.dmId}`} className="underline hover:no-underline">
                            {message.dmId}
                        </Link>
                    </p>
                </div>
                <span className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full bg-[var(--danger)]/10 text-[var(--danger)]">
                    {reporterCount} {reporterCount === 1 ? 'report' : 'reports'}
                </span>
            </div>

            <p className="text-sm text-[var(--text-primary)] break-words bg-[var(--bg-primary)] rounded-lg px-3 py-2">
                {messagePreview(message)}
            </p>

            <div className="flex items-center gap-2">
                <button
                    onClick={handleDismiss}
                    disabled={busy !== null || !!message.deletedAt}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {busy === 'dismiss' ? 'Dismissing…' : 'Dismiss report'}
                </button>
                <button
                    onClick={handleDelete}
                    disabled={busy !== null || !!message.deletedAt}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    {busy === 'delete' ? 'Deleting…' : 'Delete message'}
                </button>
            </div>
        </div>
    );
}

export default function AdminReportsPage() {
    const { currentUser, authReady } = useAppStore();

    // Cosmetic only — firestore.rules' isAdmin() branch on the messages read
    // rule is the actual access control. A non-admin landing here just gets an
    // empty/erroring query, not real data; this redirect is purely so they
    // don't see a confusing blank moderation UI.
    const isAdmin = !!currentUser?.isAdmin;
    const { messages, loading, error } = useReportedMessages(isAdmin);

    if (!authReady) {
        return (
            <div className="h-dvh flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentUser || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-dvh bg-[var(--bg-primary)]">
            <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <Link
                        to="/"
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] transition-colors"
                        aria-label="Back to chats"
                    >
                        <svg
                            width="18"
                            height="18"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </Link>
                    <h1 className="text-lg font-bold text-[var(--text-primary)]">
                        Reported Messages
                    </h1>
                </div>
                <ThemeToggle />
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-3">
                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {!loading && error && (
                    <p className="text-sm text-[var(--danger)] text-center py-12">
                        Failed to load reported messages. Check the console for details.
                    </p>
                )}

                {!loading && !error && messages.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            No reported messages
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                            Reports will show up here in real time.
                        </p>
                    </div>
                )}

                {messages.map((message) => (
                    <ReportedMessageRow key={`${message.dmId}_${message.id}`} message={message} />
                ))}
            </main>
        </div>
    );
}
