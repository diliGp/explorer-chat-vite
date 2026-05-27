import type { Gender } from '@/types'
import { getFlag } from '@/lib/utils/countries'

interface UserAvatarProps {
  name: string
  gender: Gender
  country: string
  isOnline?: boolean
  size?: 'sm' | 'md' | 'lg'
  showFlag?: boolean
}

const GENDER_COLORS: Record<Gender, string> = {
  male: '#3b82f6',
  female: '#ec4899',
  other: '#8b5cf6',
  prefer_not_to_say: '#6b7280',
}

const SIZES = {
  sm: { outer: 32, inner: 28, font: 12, dot: 8 },
  md: { outer: 40, inner: 36, font: 15, dot: 10 },
  lg: { outer: 52, inner: 46, font: 19, dot: 12 },
}

export function UserAvatar({ name, gender, country, isOnline = false, size = 'md', showFlag = true }: UserAvatarProps) {
  const { outer, inner, font, dot } = SIZES[size]
  const color = GENDER_COLORS[gender]
  const initial = name.charAt(0).toUpperCase()
  const flag = getFlag(country)

  return (
    <div className="relative flex-shrink-0" style={{ width: outer, height: outer }}>
      {/* Colored ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: isOnline ? color : 'var(--border)', padding: 2 }}
      >
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-semibold"
          style={{
            background: 'var(--bg-elevated)',
            color: color,
            fontSize: font,
          }}
        >
          {initial}
        </div>
      </div>

      {/* Online dot */}
      {isOnline && (
        <div
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--bg-primary)]"
          style={{
            width: dot,
            height: dot,
            background: 'var(--success)',
          }}
          aria-label="Online"
        />
      )}

      {/* Country flag */}
      {showFlag && (
        <div
          className="absolute -top-1 -right-1 text-xs leading-none"
          title={country}
          aria-label={`from ${country}`}
          style={{ fontSize: size === 'sm' ? 10 : 12 }}
        >
          {flag}
        </div>
      )}
    </div>
  )
}
