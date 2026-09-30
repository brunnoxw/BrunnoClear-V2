'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'

import { cn } from '@/lib/utils'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        'bg-zinc-300 dark:bg-zinc-600',
        'data-[state=checked]:bg-rose-500 data-[state=checked]:dark:bg-rose-400',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200',
          'data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-5'
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
