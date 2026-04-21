import { useEffect } from 'react'

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
      on: (channel: string, callback: (...args: unknown[]) => void) => () => void
    }
  }
}

export function useDb() {
  const invoke = <T>(channel: string, ...args: unknown[]): Promise<T> => {
    if (window.electronAPI) {
      return window.electronAPI.invoke(channel, ...args) as Promise<T>
    }
    return Promise.reject(new Error('Electron API not available'))
  }

  return { invoke }
}

export function useElectronEvent(channel: string, callback: (...args: unknown[]) => void) {
  useEffect(() => {
    if (!window.electronAPI?.on) return
    const unsub = window.electronAPI.on(channel, callback)
    return unsub
  }, [channel, callback])
}
