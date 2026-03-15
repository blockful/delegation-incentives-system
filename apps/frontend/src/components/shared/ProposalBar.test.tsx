import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { ProposalBar } from './ProposalBar'

describe('ProposalBar', () => {
  it('renders score text', () => {
    const votes = [true, true, true, true, true, true, true, true, true, false]
    renderApp(<ProposalBar votes={votes} />)
    expect(screen.getByText('9/10')).toBeInTheDocument()
  })

  it('renders 10 segments', () => {
    const votes = Array(10).fill(true)
    const { container } = renderApp(<ProposalBar votes={votes} />)
    const segments = container.querySelectorAll('[data-segment]')
    expect(segments).toHaveLength(10)
  })

  it('marks voted segments as filled', () => {
    const votes = [true, false, true, false, true, false, true, false, true, false]
    const { container } = renderApp(<ProposalBar votes={votes} />)
    const voted = container.querySelectorAll('[data-voted="true"]')
    const missed = container.querySelectorAll('[data-voted="false"]')
    expect(voted).toHaveLength(5)
    expect(missed).toHaveLength(5)
  })
})
