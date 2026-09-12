import type {Page} from '@playwright/test'

const statuses = new Set(['execution_failed', 'unavailable', 'not_editable', 'event_failed', 'not_applied', 'operation_failed'])
export class PrivateInputError extends Error {
  readonly category: string
  readonly field: string
  constructor(status: string, selector: string) {
    const category = statuses.has(status) ? status : 'unknown'
    super(`Private input failed: ${category}`)
    this.category = category
    this.field = selector === '#request-documents-full_name' ? 'documents.name' : 'other'
  }
}

export async function fillPrivateInput(page: Page, selector: string, value: string): Promise<void> {
  // locator.fill records its value in failed API steps. Evaluate arguments are not
  // diagnostic text; keep every browser-side failure inside a fixed result boundary.
  let status = 'execution_failed'
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    status = await Promise.race([
      page.evaluate(async ({selector, value}) => {
        let eventFailed = false
        const suppressEventError = (event: ErrorEvent) => { eventFailed = true; event.preventDefault() }
        const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
        const deadline = performance.now() + 4_000
        try {
          while (performance.now() < deadline) {
            const element = document.querySelector(selector)
            if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return 'unavailable'
            if (!element.checkVisibility({checkOpacity: true, checkVisibilityCSS: true})) return 'unavailable'
            if (element.matches(':disabled') || element.readOnly || element.closest('[inert]')) return 'not_editable'
            window.addEventListener('error', suppressEventError)
            element.focus()
            if (document.activeElement !== element) return 'not_editable'
            const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
            Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value)
            element.dispatchEvent(new InputEvent('input', {bubbles: true, inputType: 'insertReplacementText', data: null}))
            element.dispatchEvent(new Event('change', {bubbles: true}))
            if (eventFailed) return 'event_failed'
            // Observe immediate controlled-input restoration or node replacement.
            await frame()
            await frame()
            if (eventFailed) return 'event_failed'
            if (document.querySelector(selector) === element && element.isConnected && element.value === value) return 'filled'
            window.removeEventListener('error', suppressEventError)
          }
          return 'not_applied'
        } catch {
          return 'operation_failed'
        } finally {
          window.removeEventListener('error', suppressEventError)
        }
      }, {selector, value}),
      new Promise<string>(resolve => { timer = setTimeout(() => resolve('execution_failed'), 5_000) }),
    ])
  } catch {
    // Page closure/protocol failures remain fixed; never return an exception string.
  } finally {
    if (timer) clearTimeout(timer)
  }
  if (status !== 'filled') throw new PrivateInputError(status, selector)
}
