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

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
