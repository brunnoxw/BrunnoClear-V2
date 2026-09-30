'use client'

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import { api } from '@/lib/api-client'
import type { TokenInfo } from '@/types/discord'

let _tokens: TokenInfo[] = []
let _activeTokenId: string | null = null
let _loading = true
let _connecting = false
let _autoConnectLock = false
let _fetchLock = false
let _switching = false
let _lastSwitchTime = 0
let _cooldownRemaining = 0
let _cooldownInterval: ReturnType<typeof setInterval> | null = null
const SWITCH_COOLDOWN_MS = 20_000
const _listeners = new Set<() => void>()
let _version = 0

function notify() {
  _version++
  _listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

function getSnapshot() {
  return _version
}

function _startCooldownTimer() {
  if (_cooldownInterval) clearInterval(_cooldownInterval)
  _cooldownRemaining = Math.max(0, SWITCH_COOLDOWN_MS - (Date.now() - _lastSwitchTime))
  _cooldownInterval = setInterval(() => {
    _cooldownRemaining = Math.max(0, SWITCH_COOLDOWN_MS - (Date.now() - _lastSwitchTime))
    if (_cooldownRemaining <= 0) {
      if (_cooldownInterval) { clearInterval(_cooldownInterval); _cooldownInterval = null }
    }
    notify()
  }, 1000)
}

async function _fetchTokens() {
  if (_fetchLock) {
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!_fetchLock) { resolve(); return }
        setTimeout(check, 100)
      }
      setTimeout(check, 100)
    })
    return
  }
  _fetchLock = true
  try {
    if (!_initialFetchDone) {
      await api.validateAllTokens().catch(() => null)
    }

    const res = await api.getTokens()
    const data = (res.data || []) as TokenInfo[]
    _tokens = data
    if (!_activeTokenId && data.length > 0) {
      _activeTokenId = data[0].id
    }

    if (data.length > 0) {
      const active = await api.getActiveToken().catch(() => null)
      const activeData = active?.data as { connected: boolean; tokenId?: string } | undefined
      if (activeData?.connected && activeData.tokenId) {
        if (!_switching) {
          _activeTokenId = activeData.tokenId
        }
      } else if (!_initialFetchDone && !_autoConnectLock) {
        _autoConnectLock = true
        const tokenToConnect = data[0].id
        try {
          await api.connectToken(tokenToConnect)
          _activeTokenId = tokenToConnect
        } catch {
        } finally {
          _autoConnectLock = false
        }
      }
    }
  } catch {
  } finally {
    _loading = false
    _fetchLock = false
    _initialFetchDone = true
    notify()
  }
}

let _initialFetchDone = false

export function useTokens() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  useEffect(() => {
    if (!_initialFetchDone) {
      _fetchTokens()
    }
  }, [])

  const fetchTokens = useCallback(async () => {
    await _fetchTokens()
  }, [])

  const addToken = useCallback(async (label: string, token: string) => {
    const res = await api.addToken(label, token)
    await _fetchTokens()
    return res.data as TokenInfo
  }, [])

  const removeToken = useCallback(async (id: string) => {
    await api.removeToken(id)
    if (_activeTokenId === id) {
      _activeTokenId = null
      notify()
    }
    await _fetchTokens()
  }, [])

  const checkToken = useCallback(async (id: string) => {
    await api.checkToken(id)
    await _fetchTokens()
  }, [])

  const switchAccount = useCallback(async (id: string) => {
    const elapsed = Date.now() - _lastSwitchTime
    if (_lastSwitchTime > 0 && elapsed < SWITCH_COOLDOWN_MS) {
      const remaining = Math.ceil((SWITCH_COOLDOWN_MS - elapsed) / 1000)
      throw new Error(`Aguarde ${remaining}s para trocar de conta`)
    }

    const prevId = _activeTokenId
    _activeTokenId = id
    _connecting = true
    _switching = true
    notify()
    try {
      await api.switchToken(id)
      _lastSwitchTime = Date.now()
      _startCooldownTimer()
    } catch (err) {
      _activeTokenId = prevId
      notify()
      throw err
    } finally {
      _connecting = false
      _switching = false
      notify()
    }
  }, [])

  const activeToken = _tokens.find((t) => t.id === _activeTokenId) || null

  return {
    tokens: _tokens,
    loading: _loading,
    connecting: _connecting,
    activeToken,
    activeTokenId: _activeTokenId,
    switchCooldownRemaining: _cooldownRemaining,
    setActiveTokenId: (id: string | null) => { _activeTokenId = id; notify() },
    switchAccount,
    addToken,
    removeToken,
    checkToken,
    refetch: fetchTokens,
  }
}
