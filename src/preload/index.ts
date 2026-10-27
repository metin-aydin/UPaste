import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS } from '@shared/ipc'

const allowed = (channel: string): void => {
  if (!CHANNELS.includes(channel)) throw new Error(`Unknown channel: ${channel}`)
}

const api = {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    allowed(channel)
    return ipcRenderer.invoke(channel, ...args)
  },
  send: (channel: string, ...args: unknown[]): void => {
    allowed(channel)
    ipcRenderer.send(channel, ...args)
  },
  on: (channel: string, listener: (...args: unknown[]) => void): (() => void) => {
    allowed(channel)
    const wrapped = (_event: IpcRendererEvent, ...args: unknown[]): void => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
}

export type UPasteBridge = typeof api

contextBridge.exposeInMainWorld('upaste', api)
