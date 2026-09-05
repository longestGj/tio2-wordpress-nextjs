import {afterAll, afterEach, beforeAll} from 'vitest'

import {server} from './tests/mocks/server'

// jsdom does not implement the native modal/top-layer APIs; real browser tests
// separately exercise focus, inert surfaces and scroll locking.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
}
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }})
}

beforeAll(() => server.listen({onUnhandledRequest: 'error'}))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
