export interface AuditCookieStore {
  get(name: string): Promise<unknown>
  getAll(): Promise<readonly unknown[]>
  set(name: string, value: string): Promise<void>
  delete(name: string): Promise<void>
}

interface StorageCalls {
  getItem: number
  key: number
  length: number
  namedRead: number
  setItem: number
  removeItem: number
  clear: number
  namedWrite: number
}

interface AuditSnapshot {
  readonly localStorage: Readonly<Record<string, string>>
  readonly sessionStorage: Readonly<Record<string, string>>
  readonly documentCookie: Readonly<Record<string, string>>
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
  readonly observed: AuditSnapshot
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

function snapshotCookies(cookie: PropertyDescriptor): Readonly<Record<string, string>> {
  const raw = cookie.get?.call(document) as string
  return Object.fromEntries(
    raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf('=')
        return separator === -1
          ? [part, '']
          : [part.slice(0, separator), part.slice(separator + 1)]
      })
      .sort(([first], [second]) => first.localeCompare(second)),
  )
}

function restoreStorage(
  storage: Storage,
  snapshot: Readonly<Record<string, string>>,
): void {
  storage.clear()
  for (const [key, value] of Object.entries(snapshot)) storage.setItem(key, value)
}

function restoreCookies(
  cookie: PropertyDescriptor,
  snapshot: Readonly<Record<string, string>>,
): void {
  for (const name of Object.keys(snapshotCookies(cookie))) {
    cookie.set?.call(document, `${name}=; Max-Age=0; Path=/`)
  }
  for (const [name, value] of Object.entries(snapshot)) {
    cookie.set?.call(document, `${name}=${value}; Path=/`)
  }
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
      if (property === 'key') {
        return (index: number) => {
          calls.key += 1
          return target.key(index)
        }
      }
      if (property === 'length') {
        calls.length += 1
        return target.length
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
      if (typeof property === 'string' && !(property in Storage.prototype)) {
        calls.namedRead += 1
        return target.getItem(property)
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
    documentCookie: snapshotCookies(cookie),
  }
  const localStorageCalls: StorageCalls = {
    getItem: 0,
    key: 0,
    length: 0,
    namedRead: 0,
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

      const observed: AuditSnapshot = {
        localStorage: snapshotStorage(realLocalStorage),
        sessionStorage: snapshotStorage(realSessionStorage),
        documentCookie: snapshotCookies(cookie),
      }
      restoreStorage(realLocalStorage, initial.localStorage)
      restoreStorage(realSessionStorage, initial.sessionStorage)
      restoreCookies(cookie, initial.documentCookie)

      finished = {
        calls: {
          localStorage: localStorageCalls,
          sessionStorage: sessionStorageCalls,
          documentCookie: documentCookieCalls,
          cookieStore: cookieStoreCalls,
        },
        initial,
        observed,
        final: {
          localStorage: snapshotStorage(realLocalStorage),
          sessionStorage: snapshotStorage(realSessionStorage),
          documentCookie: snapshotCookies(cookie),
        },
      }
      return finished
    },
  }
}
