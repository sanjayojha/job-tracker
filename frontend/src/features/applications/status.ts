/**
 * The pipeline's visual vocabulary, in one place.
 *
 * Colour is deliberately restrained: grey for stages needing no action, brand
 * blue for stages in play, and colour reserved for outcomes. Staleness is the
 * only thing allowed to shout, because being told what has gone quiet is the
 * point of the tool -- seven competing hues would drown that out.
 *
 * Must stay in step with the backend status enum.
 */
export const APPLICATION_STATUSES = [
  'wishlist',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const STATUS_STYLES: Record<ApplicationStatus, { label: string; className: string }> = {
  // Logged, but nothing is happening yet.
  wishlist: { label: 'Wishlist', className: 'bg-ink-10 text-ink-70' },
  applied: { label: 'Applied', className: 'bg-ink-10 text-ink-70' },
  // In play: something is actively moving.
  screening: { label: 'Screening', className: 'bg-brand-10 text-brand-70' },
  interview: { label: 'Interview', className: 'bg-brand-10 text-brand-70' },
  offer: { label: 'Offer', className: 'bg-positive-10 text-positive-70' },
  // Closed: recede rather than disappear, so the list stays scannable.
  rejected: { label: 'Rejected', className: 'bg-ink-10 text-ink-50' },
  withdrawn: { label: 'Withdrawn', className: 'bg-ink-10 text-ink-50' },
}
