import '@testing-library/jest-dom'
import './mocks/wagmi'

import { server } from './mocks/server'

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []

  disconnect = () => {}
  observe = () => {}
  takeRecords = () => []
  unobserve = () => {}
}

globalThis.IntersectionObserver = MockIntersectionObserver

// jsdom does not implement window.matchMedia. Components that read it during
// initial render (e.g. CompareDrawer's responsive side detection) blow up
// without this shim.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
