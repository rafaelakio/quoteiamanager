import { useEffect } from 'react'

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}

// Stable reference — defined outside the hook so it never changes between renders
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  if (window.electronAPI) {
    return window.electronAPI.invoke(channel, ...args) as Promise<T>
  }
  return Promise.reject(new Error('Electron API not available'))
}

export function useDb() {
  return { invoke }
}

export function useElectronEvent(channel: string, callback: (...args: unknown[]) => void) {
  useEffect(() => {
    if (!window.electronAPI?.on) return
    const unsub = window.electronAPI.on(channel, callback)
    return unsub
  }, [channel, callback])
}
