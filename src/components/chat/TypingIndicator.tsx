interface TypingIndicatorProps {
    names: string[];
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
    if (names.length === 0) return null;

    const label = names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`;

    return (
        <div
            className="flex items-center gap-2 px-4 py-2 animate-fade-in"
            aria-live="polite"
            aria-label={label}
        >
            <div className="bubble-other px-3 py-2 flex items-center gap-1">
                <span className="typing-dot" aria-hidden="true" />
                <span className="typing-dot" aria-hidden="true" />
                <span className="typing-dot" aria-hidden="true" />
            </div>
            <span className="text-xs text-[var(--text-muted)]">{label}</span>
        </div>
    );
}
