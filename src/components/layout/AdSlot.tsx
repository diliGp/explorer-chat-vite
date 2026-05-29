interface AdSlotProps {
    id: string;
    width: number;
    height: number;
    className?: string;
    label?: string;
}

/**
 * Placeholder ad slot — replace inner content with
 * <ins className="adsbygoogle" ...> when AdSense is approved.
 * Fixed dimensions prevent layout shift (CLS).
 */
export function AdSlot({
    id,
    width,
    height,
    className = '',
    label = 'Advertisement',
}: AdSlotProps) {
    return (
        <div
            id={`ad-${id}`}
            aria-label={label}
            aria-hidden="true"
            className={`ad-slot ${className}`}
            style={{ width, height, minWidth: width, minHeight: height }}
        >
            <span>{label}</span>
        </div>
    );
}
