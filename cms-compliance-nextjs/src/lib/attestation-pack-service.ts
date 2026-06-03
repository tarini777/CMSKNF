import jsPDF from 'jspdf'
import { buildAttestationChecklist, getActiveProgramYear, getUsCalendarSummary } from '@/lib/submission-calendar'
import { getCmsExportStats } from '@/lib/cms-export-service'
import { validatePufExports } from '@/lib/puf-validation-service'
import { validateExportReadiness } from '@/lib/export-guard-service'

export interface AttestationPackInput {
  programYear?: string
  attesterName?: string
  attesterTitle?: string
  companyName?: string
}

export async function generateAttestationPackPdf(input: AttestationPackInput = {}): Promise<Buffer> {
  const year = input.programYear || String(getActiveProgramYear())
  const [stats, pufValidation, exportGuard, usSummary] = await Promise.all([
    getCmsExportStats(year),
    validatePufExports(year),
    validateExportReadiness(year),
    Promise.resolve(getUsCalendarSummary(parseInt(year, 10))),
  ])

  const checklist = buildAttestationChecklist({
    ...stats,
    exportGenerated: stats.reportableRecords > 0,
    nppesVerified: exportGuard.nppesFailures === 0 || exportGuard.nppesPolicy !== 'block',
    aggregatesCurrent: exportGuard.pendingAggregates === 0,
    pufValidated: pufValidation.valid,
  })

  const doc = new jsPDF('p', 'mm', 'a4')
  const margin = 18
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = margin

  const addLine = (text: string, size = 11, bold = false) => {
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, pageWidth - margin * 2)
    if (y + lines.length * 5 > 280) {
      doc.addPage()
      y = margin
    }
    doc.text(lines, margin, y)
    y += lines.length * 5 + 2
  }

  doc.setFillColor(15, 76, 129)
  doc.rect(0, 0, pageWidth, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CMS Open Payments Attestation Pack', margin, 18)
  doc.setTextColor(0, 0, 0)
  y = 38

  addLine(`Program year: ${year}`, 12, true)
  addLine(`Generated: ${new Date().toISOString()}`, 10)
  addLine(`Company: ${input.companyName || 'Applicable Manufacturer / GPO'}`, 10)
  addLine(`Submission window: ${usSummary.submissionWindow}`, 10)
  addLine(`Attestation deadline: ${usSummary.reportingDeadline}`, 10)
  y += 4

  addLine('Submission statistics', 13, true)
  addLine(`Total records: ${stats.totalRecords}`)
  addLine(`Reportable: ${stats.reportableRecords}`)
  addLine(`Unresolved disputes: ${stats.unresolvedDisputes}`)
  addLine(`PUF validation: ${pufValidation.valid ? 'PASS' : 'FAIL'} (${pufValidation.totalErrors} errors)`)
  y += 4

  addLine('Attestation checklist', 13, true)
  for (const item of checklist) {
    const mark = item.completed ? '[x]' : '[ ]'
    addLine(`${mark} ${item.label}${item.required ? ' (required)' : ''}`, 10)
  }
  y += 6

  addLine('Certification', 13, true)
  addLine(
    'I certify that, to the best of my knowledge, the data submitted for this program year is timely, accurate, and complete per 42 CFR Part 403 and CMS Open Payments guidance.'
  )
  y += 8
  addLine(`Attester name: ${input.attesterName || '_______________________________'}`)
  addLine(`Title: ${input.attesterTitle || '_______________________________'}`)
  addLine(`Date: _______________________________`)
  addLine(`Signature: _______________________________`)
  y += 6
  addLine(
    'Note: Final attestation must be completed manually on the CMS Open Payments System (OPS) portal by an authorized attester.',
    9
  )

  return Buffer.from(doc.output('arraybuffer'))
}
