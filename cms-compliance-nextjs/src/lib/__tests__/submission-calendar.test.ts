import {
  getActiveProgramYear,
  getSubmissionCalendar,
  getUsSubmissionCalendar,
  getMilestoneStatus,
} from '@/lib/submission-calendar'

describe('submission-calendar', () => {
  it('returns 8 US milestones for a program year', () => {
    const us = getUsSubmissionCalendar(2025)
    expect(us).toHaveLength(8)
    expect(us.every((m) => m.jurisdiction === 'US')).toBe(true)
  })

  it('sets CMS submission window Feb 1 – Mar 31 of following year', () => {
    const us = getUsSubmissionCalendar(2025)
    const submission = us.find((m) => m.id === 'us_submission')
    expect(submission?.startDate).toBe('2026-02-01')
    expect(submission?.endDate).toBe('2026-03-31')
  })

  it('includes May 16–30 additional dispute correction window', () => {
    const us = getUsSubmissionCalendar(2025)
    const correction = us.find((m) => m.id === 'us_dispute_correction')
    expect(correction?.startDate).toBe('2026-05-16')
    expect(correction?.endDate).toBe('2026-05-30')
  })

  it('includes international milestones in full calendar', () => {
    const all = getSubmissionCalendar(2025)
    expect(all.some((m) => m.jurisdiction === 'FR')).toBe(true)
    expect(all.some((m) => m.id === 'us_attestation')).toBe(true)
  })

  it('resolves active program year as prior year Jan–Jun', () => {
    expect(getActiveProgramYear(new Date('2026-03-15'))).toBe(2025)
    expect(getActiveProgramYear(new Date('2026-08-01'))).toBe(2026)
  })

  it('computes milestone status', () => {
    const us = getUsSubmissionCalendar(2025)
    const submission = us.find((m) => m.id === 'us_submission')!
    expect(getMilestoneStatus(submission, new Date('2026-02-15'))).toBe('active')
    expect(getMilestoneStatus(submission, new Date('2026-01-15'))).toBe('upcoming')
    expect(getMilestoneStatus(submission, new Date('2026-04-01'))).toBe('past')
  })
})
