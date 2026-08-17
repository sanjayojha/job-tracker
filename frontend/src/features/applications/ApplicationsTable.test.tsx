import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../test/renderWithProviders'
import { ApplicationsTable } from './ApplicationsTable'
import type { Application } from './api'

function buildApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 1,
    title: 'Backend Engineer',
    status: 'applied',
    applied_at: '2026-08-03',
    source_url: null,
    notes: null,
    company: { id: 1, name: 'Deliveroo', website: null, notes: null },
    status_changed_at: '2026-08-05T09:00:00Z',
    created_at: '2026-08-03T09:00:00Z',
    updated_at: '2026-08-03T09:00:00Z',
    ...overrides,
  }
}

function renderTable(props: Partial<Parameters<typeof ApplicationsTable>[0]> = {}) {
  const onSort = vi.fn()

  renderWithProviders(
    <ApplicationsTable
      applications={[buildApplication()]}
      sort="applied_at"
      direction="desc"
      onSort={onSort}
      {...props}
    />,
  )

  return { onSort }
}

describe('ApplicationsTable', () => {
  it('renders a row per application', () => {
    renderTable({
      applications: [
        buildApplication({ id: 1, title: 'Backend Engineer' }),
        buildApplication({ id: 2, title: 'Platform Engineer' }),
      ],
    })

    expect(screen.getByRole('row', { name: /Backend Engineer/ })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Platform Engineer/ })).toBeInTheDocument()
  })

  it('shows an em dash rather than a blank cell for a wishlist entry', () => {
    // A blank cell reads as missing data; the dash says "there is no date yet".
    renderTable({
      applications: [buildApplication({ status: 'wishlist', applied_at: null })],
    })

    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('offers a sort control only for columns the API can sort', () => {
    // Company is a joined name and "Last moved" is a relation; neither is in
    // the endpoint's sort allow-list, so a control here would do nothing.
    renderTable()

    expect(screen.getByRole('button', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Applied' })).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Company' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Last moved' })).not.toBeInTheDocument()
  })

  it('marks the sorted column for assistive technology', () => {
    // The arrow conveys this visually only; aria-sort is what a screen reader
    // reads, and there is no component library supplying it.
    renderTable({ sort: 'status', direction: 'asc' })

    expect(screen.getByRole('columnheader', { name: 'Status' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: 'Role' })).toHaveAttribute(
      'aria-sort',
      'none',
    )
  })

  it('asks for a new sort column when an unsorted header is clicked', async () => {
    const { onSort } = renderTable({ sort: 'applied_at', direction: 'desc' })

    await userEvent.click(screen.getByRole('button', { name: 'Status' }))

    expect(onSort).toHaveBeenCalledWith('status')
  })

  it('is reachable by keyboard', async () => {
    // Hand-built, so nothing guarantees this but the markup being a button.
    const { onSort } = renderTable()

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(onSort).toHaveBeenCalledWith('title')
  })
})
