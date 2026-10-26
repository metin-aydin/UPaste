import type { UPasteBridge } from './index'

declare global {
  interface Window {
    upaste: UPasteBridge
  }
}

export {}
