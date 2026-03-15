import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

export function renderApp(
  ui: ReactElement,
  {
    initialPath = '/',
    ...options
  }: { initialPath?: string } & RenderOptions = {},
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>,
    options,
  )
}

export { default as userEvent } from '@testing-library/user-event'
