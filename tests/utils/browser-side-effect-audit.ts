export interface AuditCookieStore {
  get(name: string): Promise<unknown>
  getAll(): Promise<readonly unknown[]>
  set(name: string, value: string): Promise<void>
  delete(name: string): Promise<void>
}

interface StorageCalls {
  getItem: number
  setItem: number
  removeItem: number
  clear: number
  namedWrite: number
}

interface AuditSnapshot {
  readonly localStorage: Readonly<Record<string, string>>
  readonly sessionStorage: Readonly<Record<string, string>>
  readonly documentCookie: string
}

export interface BrowserSideEffectAuditResult {
  readonly calls: {
    readonly localStorage: Readonly<StorageCalls>
    readonly sessionStorage: Readonly<StorageCalls>
    readonly documentCookie: {readonly get: number; readonly set: number}
    readonly cookieStore: {
      readonly get: number
      readonly getAll: number
      readonly set: number
      readonly delete: number
    }
  }
  readonly initial: AuditSnapshot
  readonly final: AuditSnapshot
}

function snapshotStorage(storage: Storage): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Array.from({length: storage.length}, (_, index) => storage.key(index))
      .filter((key): key is string => key !== null)
      .sort()
      .map((key) => [key, storage.getItem(key) ?? '']),
  )
}

function cookieDescriptor(): PropertyDescriptor {
  let owner: object | null = document
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, 'cookie')
    if (descriptor?.get && descriptor.set) return descriptor
    owner = Object.getPrototypeOf(owner) as object | null
  }
  throw new Error('document.cookie accessor is unavailable')
}

function storageProxy(storage: Storage, calls: StorageCalls): Storage {
  return new Proxy(storage, {
    get(target, property) {
      if (property === 'getItem') {
        return (key: string) => {
          calls.getItem += 1
          return target.getItem(key)
        }
      }
      if (property === 'setItem') {
        return (key: string, value: string) => {
          calls.setItem += 1
          target.setItem(key, value)
        }
      }
      if (property === 'removeItem') {
        return (key: string) => {
          calls.removeItem += 1
          target.removeItem(key)
        }
      }
      if (property === 'clear') {
        return () => {
          calls.clear += 1
          target.clear()
        }
      }
      const value = Reflect.get(target, property, target) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, property, value) {
      calls.namedWrite += 1
      target.setItem(String(property), String(value))
      return true
    },
  })
}

export function installBrowserSideEffectAudit(): {
  finish(): BrowserSideEffectAuditResult
} {
  const realLocalStorage = window.localStorage
  const realSessionStorage = window.sessionStorage
  const cookie = cookieDescriptor()
  const initial: AuditSnapshot = {
    localStorage: snapshotStorage(realLocalStorage),
    sessionStorage: snapshotStorage(realSessionStorage),
    documentCookie: cookie.get?.call(document) as string,
  }
  const localStorageCalls: StorageCalls = {
    getItem: 0,
    setItem: 0,
    removeItem: 0,
    clear: 0,
    namedWrite: 0,
  }
  const sessionStorageCalls: StorageCalls = {...localStorageCalls}
  const documentCookieCalls = {get: 0, set: 0}
  const cookieStoreCalls = {get: 0, getAll: 0, set: 0, delete: 0}
  const localStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage')
  const sessionStorageDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
  const documentCookieDescriptor = Object.getOwnPropertyDescriptor(document, 'cookie')
  const cookieStoreDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'cookieStore')

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storageProxy(realLocalStorage, localStorageCalls),
  })
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    value: storageProxy(realSessionStorage, sessionStorageCalls),
  })
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() {
      documentCookieCalls.get += 1
      return cookie.get?.call(document) as string
    },
    set(value: string) {
      documentCookieCalls.set += 1
      cookie.set?.call(document, value)
    },
  })
  const cookieStore: AuditCookieStore = {
    async get() {
      cookieStoreCalls.get += 1
      return undefined
    },
    async getAll() {
      cookieStoreCalls.getAll += 1
      return []
    },
    async set() {
      cookieStoreCalls.set += 1
    },
    async delete() {
      cookieStoreCalls.delete += 1
    },
  }
  Object.defineProperty(globalThis, 'cookieStore', {
    configurable: true,
    value: cookieStore,
  })

  let finished: BrowserSideEffectAuditResult | undefined
  return {
    finish() {
      if (finished) return finished

      if (localStorageDescriptor) {
        Object.defineProperty(window, 'localStorage', localStorageDescriptor)
      } else {
        delete (window as unknown as {localStorage?: Storage}).localStorage
      }
      if (sessionStorageDescriptor) {
        Object.defineProperty(window, 'sessionStorage', sessionStorageDescriptor)
      } else {
        delete (window as unknown as {sessionStorage?: Storage}).sessionStorage
      }
      if (documentCookieDescriptor) {
        Object.defineProperty(document, 'cookie', documentCookieDescriptor)
      } else {
        delete (document as unknown as {cookie?: string}).cookie
      }
      if (cookieStoreDescriptor) {
        Object.defineProperty(globalThis, 'cookieStore', cookieStoreDescriptor)
      } else {
        delete (globalThis as {cookieStore?: AuditCookieStore}).cookieStore
      }

      finished = {
        calls: {
          localStorage: localStorageCalls,
          sessionStorage: sessionStorageCalls,
          documentCookie: documentCookieCalls,
          cookieStore: cookieStoreCalls,
        },
        initial,
        final: {
          localStorage: snapshotStorage(realLocalStorage),
          sessionStorage: snapshotStorage(realSessionStorage),
          documentCookie: cookie.get?.call(document) as string,
        },
      }
      return finished
    },
  }
}
