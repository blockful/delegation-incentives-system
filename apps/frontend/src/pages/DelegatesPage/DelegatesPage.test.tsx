import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegatesPage } from './index'

describe('DelegatesPage', () => {
  it('renders page heading', () => {
    renderApp(<DelegatesPage />)
    expect(
      screen.getByText('Delegate to someone who shows up'),
    ).toBeInTheDocument()
  })

  it('renders stats bar fields from /stats fixture', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getByText('47')).toBeInTheDocument()
    })
    expect(screen.getByText('active delegates')).toBeInTheDocument()
    expect(screen.getByText('1.3M')).toBeInTheDocument()
    expect(screen.getByText('ENS delegated')).toBeInTheDocument()
    expect(screen.getByText('412')).toBeInTheDocument()
    expect(screen.getByText('holders earning')).toBeInTheDocument()
  })

  it('renders delegate cards after loading', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getByText('0x1234…5678')).toBeInTheDocument()
    })
    expect(screen.getByText('0xabcd…abcd')).toBeInTheDocument()
    expect(screen.getByText('0x9876…5432')).toBeInTheDocument()
  })

  it('renders sort controls', () => {
    renderApp(<DelegatesPage />)
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText(/Random/)).toBeInTheDocument()
  })
})
