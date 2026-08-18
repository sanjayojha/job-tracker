import { describe, expect, it } from 'vitest'
import { changedFields, fieldsFromApplication } from './applicationFields'
import type { Application } from './api'

const application = {
  id: 42,
  title: 'Senior Backend Engineer',
  status: 'screening',
  applied_at: '2026-08-03',
  source_url: 'https://example.com/job/1',
  notes: 'Referred by Priya',
  company: { id: 7, name: 'Monzo', website: null, notes: null },
  created_at: '2026-08-03T09:00:00Z',
  updated_at: '2026-08-10T09:00:00Z',
} as Application

describe('fieldsFromApplication', () => {
  it('maps an application onto form values', () => {
    expect(fieldsFromApplication(application)).toEqual({
      companyId: 7,
      title: 'Senior Backend Engineer',
      appliedAt: '2026-08-03',
      sourceUrl: 'https://example.com/job/1',
      notes: 'Referred by Priya',
    })
  })

  it('turns nulls into empty strings so the inputs stay controlled', () => {
    const bare = { ...application, applied_at: null, source_url: null, notes: null }

    expect(fieldsFromApplication(bare)).toMatchObject({
      appliedAt: '',
      sourceUrl: '',
      notes: '',
    })
  })
})

describe('changedFields', () => {
  const original = fieldsFromApplication(application)

  it('sends nothing when nothing changed', () => {
    expect(changedFields(original, original)).toEqual({})
  })

  it('sends only the fields that moved', () => {
    const changes = changedFields(original, { ...original, title: 'Staff Engineer' })

    // An untouched key means "leave it alone" to the API, so sending the whole
    // object would make every edit a full replacement.
    expect(changes).toEqual({ title: 'Staff Engineer' })
  })

  it('clears an emptied optional field with null, not an empty string', () => {
    const changes = changedFields(original, { ...original, sourceUrl: '', appliedAt: '' })

    // '' fails the API's `url` and `date` rules; null is how the endpoint is
    // told to clear the column.
    expect(changes).toEqual({ source_url: null, applied_at: null })
  })

  it('trims before comparing, so whitespace alone is not a change', () => {
    expect(changedFields(original, { ...original, title: '  Senior Backend Engineer  ' })).toEqual({})
  })

  it('never sends a null company, because the field is required', () => {
    // The form blocks submission in this state; this guards the helper if it
    // is ever called from somewhere that does not.
    expect(changedFields(original, { ...original, companyId: null })).toEqual({})
  })

  it('sends a changed company id', () => {
    expect(changedFields(original, { ...original, companyId: 9 })).toEqual({ company_id: 9 })
  })
})
