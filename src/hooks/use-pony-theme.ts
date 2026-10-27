import { useSyncExternalStore } from 'react'
import { getPony } from '@/lib/pony-themes'

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme-family', 'data-pony'],
  })
  return () => observer.disconnect()
}

function currentPony() {
  const root = document.documentElement
  return root.dataset.themeFamily === 'my-little-pony' ? root.dataset.pony ?? '' : ''
}

export function usePonyTheme() {
  const id = useSyncExternalStore(subscribe, currentPony, () => '')
  return id ? getPony(id) : undefined
}
