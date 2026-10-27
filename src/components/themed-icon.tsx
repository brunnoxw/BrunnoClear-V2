import type { ReactNode } from 'react'
import type { XpIconName } from '@/lib/xp-icons'
import { cn } from '@/lib/utils'

interface ThemedIconProps {
  name: XpIconName
  children: ReactNode
  size?: number
  className?: string
}

/** Keeps the normal icon in other themes and uses the local XP artwork in Luna. */
export function ThemedIcon({ name, children, size = 16, className }: ThemedIconProps) {
  return (
    <span
      className={cn('theme-icon inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <span className="theme-icon-default inline-flex items-center justify-center">{children}</span>
      <img
        className="theme-icon-xp h-full w-full object-contain"
        src={`/themes/windows-xp/${name}.png`}
        alt=""
        draggable={false}
        width={size}
        height={size}
      />
    </span>
  )
}
