import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { ReportData, AnalyticsMetrics } from '@/types/cms'

export class PDFReportService {
  /**
   * Generate a comprehensive PDF report
   */
  async generateComplianceReport(
    reportData: ReportData,
    metrics: AnalyticsMetrics,
    includeCharts: boolean = true
  ): Promise<Blob> {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPosition = margin

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
      doc.setFontSize(fontSize)
      const lines = doc.splitTextToSize(text, maxWidth)
      doc.text(lines, x, y)
      return y + (lines.length * fontSize * 0.4)
    }

    // Helper function to add a new page if needed
    const checkNewPage = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin) {
        doc.addPage()
        yPosition = margin
        return true
      }
      return false
    }

    // Title Page
    doc.setFillColor(34, 197, 94) // Green-500
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('CMS Compliance Report', margin, 25)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`, margin, 35)
    
    yPosition = 60

    // Executive Summary
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Executive Summary', margin, yPosition, pageWidth - 2 * margin, 18)
    yPosition += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const summaryText = `
This report provides a comprehensive analysis of CMS compliance data for the period 
${new Date(reportData.period.start).toLocaleDateString()} to ${new Date(reportData.period.end).toLocaleDateString()}.

Key findings:
• Total Records Processed: ${reportData.summary.totalRecords.toLocaleString()}
• Compliance Score: ${reportData.summary.complianceScore}%
• Anomalies Detected: ${reportData.summary.anomaliesDetected}
• Reportable Records: ${reportData.summary.reportableRecords}
• Non-Reportable Records: ${reportData.summary.nonReportableRecords}
    `.trim()

    yPosition = addText(summaryText, margin, yPosition, pageWidth - 2 * margin)
    yPosition += 15

    // Key Metrics Section
    checkNewPage(80)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Key Performance Metrics', margin, yPosition, pageWidth - 2 * margin, 16)
    yPosition += 10

    // Metrics table
    const metricsData = [
      ['Metric', 'Value', 'Status'],
      ['Data Quality Score', `${metrics.overview.dataQualityScore}%`, this.getStatusText(metrics.overview.dataQualityScore)],
      ['Compliance Score', `${metrics.overview.complianceScore}%`, this.getStatusText(metrics.overview.complianceScore)],
      ['Total Records', metrics.overview.totalRecords.toLocaleString(), 'Active'],
      ['Active Rules', metrics.overview.totalRules.toString(), 'Active'],
      ['Processing Efficiency', `${metrics.insights.processingEfficiency.successRate}%`, this.getStatusText(metrics.insights.processingEfficiency.successRate)],
    ]

    yPosition = this.addTable(doc, metricsData, margin, yPosition, pageWidth - 2 * margin)
    yPosition += 15

    // Anomaly Analysis
    checkNewPage(100)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Anomaly Analysis', margin, yPosition, pageWidth - 2 * margin, 16)
    yPosition += 10

    if (metrics.insights.topAnomalyTypes.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      yPosition = addText('Top Anomaly Types:', margin, yPosition, pageWidth - 2 * margin)
      yPosition += 5

      metrics.insights.topAnomalyTypes.slice(0, 5).forEach((anomaly, index) => {
        const anomalyText = `${index + 1}. ${anomaly.type}: ${anomaly.count} occurrences (${anomaly.percentage}%)`
        yPosition = addText(anomalyText, margin + 10, yPosition, pageWidth - 2 * margin - 10)
      })
    } else {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      yPosition = addText('No significant anomalies detected during this period.', margin, yPosition, pageWidth - 2 * margin)
    }

    yPosition += 15

    // Geographic Analysis
    checkNewPage(80)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Geographic Compliance Analysis', margin, yPosition, pageWidth - 2 * margin, 16)
    yPosition += 10

    if (metrics.insights.complianceByState.length > 0) {
      const geoData = [
        ['State', 'Compliance Score', 'Record Count'],
        ...metrics.insights.complianceByState.slice(0, 10).map(state => [
          state.state,
          `${state.score}%`,
          state.recordCount.toString()
        ])
      ]
      yPosition = this.addTable(doc, geoData, margin, yPosition, pageWidth - 2 * margin)
    } else {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      yPosition = addText('No geographic data available for this period.', margin, yPosition, pageWidth - 2 * margin)
    }

    yPosition += 15

    // Recommendations
    checkNewPage(100)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    yPosition = addText('Recommendations', margin, yPosition, pageWidth - 2 * margin, 16)
    yPosition += 10

    if (metrics.recommendations.length > 0) {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      metrics.recommendations.forEach((recommendation, index) => {
        const recText = `${index + 1}. ${recommendation}`
        yPosition = addText(recText, margin, yPosition, pageWidth - 2 * margin)
        yPosition += 5
      })
    } else {
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      yPosition = addText('No specific recommendations at this time. Continue monitoring data quality metrics.', margin, yPosition, pageWidth - 2 * margin)
    }

    yPosition += 15

    // Data Quality Issues
    if (reportData.details.qualityIssues.length > 0) {
      checkNewPage(80)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      yPosition = addText('Data Quality Issues', margin, yPosition, pageWidth - 2 * margin, 16)
      yPosition += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      reportData.details.qualityIssues.forEach((issue, index) => {
        const issueText = `${index + 1}. ${issue}`
        yPosition = addText(issueText, margin, yPosition, pageWidth - 2 * margin)
        yPosition += 5
      })
    }

    // Footer
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10)
      doc.text('CMS Compliance Platform - Confidential', margin, pageHeight - 10)
    }

    return doc.output('blob')
  }

  /**
   * Generate a quick summary report
   */
  async generateSummaryReport(metrics: AnalyticsMetrics): Promise<Blob> {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let yPosition = margin

    // Title
    doc.setFillColor(34, 197, 94)
    doc.rect(0, 0, pageWidth, 30, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('CMS Compliance Summary', margin, 20)
    
    yPosition = 50

    // Key metrics in a clean format
    doc.setTextColor(0, 0, 0)
    const summaryData = [
      ['Data Quality Score', `${metrics.overview.dataQualityScore}%`],
      ['Compliance Score', `${metrics.overview.complianceScore}%`],
      ['Total Records', metrics.overview.totalRecords.toLocaleString()],
      ['Active Rules', metrics.overview.totalRules.toString()],
      ['Processing Success Rate', `${metrics.insights.processingEfficiency.successRate}%`],
    ]

    yPosition = this.addTable(doc, summaryData, margin, yPosition, pageWidth - 2 * margin)

    return doc.output('blob')
  }

  /**
   * Add a table to the PDF
   */
  private addTable(doc: jsPDF, data: string[][], x: number, y: number, width: number): number {
    const rowHeight = 8
    const colWidth = width / data[0].length
    let currentY = y

    // Draw table
    data.forEach((row, rowIndex) => {
      let currentX = x
      
      row.forEach((cell, colIndex) => {
        // Draw cell border
        doc.rect(currentX, currentY, colWidth, rowHeight)
        
        // Add cell content
        doc.setFontSize(10)
        if (rowIndex === 0) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }
        
        const cellText = doc.splitTextToSize(cell, colWidth - 4)
        doc.text(cellText, currentX + 2, currentY + 5)
        
        currentX += colWidth
      })
      
      currentY += rowHeight
    })

    return currentY + 5
  }

  /**
   * Get status text based on score
   */
  private getStatusText(score: number): string {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 60) return 'Poor'
    return 'Critical'
  }

  /**
   * Generate report from HTML element (for charts)
   */
  async generateReportWithCharts(elementId: string, reportData: ReportData): Promise<Blob> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error('Element not found')
    }

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    })

    // Create PDF
    const imgData = canvas.toDataURL('image/png')
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    
    // Calculate dimensions to fit the image
    const imgWidth = pageWidth - 40
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    
    // Add image
    doc.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight)
    
    // Add report metadata
    doc.setFontSize(12)
    doc.text(`Report Generated: ${new Date().toLocaleDateString()}`, 20, pageHeight - 20)
    doc.text(`Period: ${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}`, 20, pageHeight - 15)

    return doc.output('blob')
  }
}

// Export singleton instance
export const pdfReportService = new PDFReportService()
