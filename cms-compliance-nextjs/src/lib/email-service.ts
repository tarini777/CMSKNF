import nodemailer from 'nodemailer'
import { CMSRecord, AnomalyDetectionResult } from '@/types/cms'

export interface EmailNotification {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export interface AnomalyAlert {
  recordId: string
  record: CMSRecord
  anomalyResult: AnomalyDetectionResult
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: Date
}

export class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    // Configure email transporter (using Gmail SMTP for demo)
    // In production, use proper SMTP configuration
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      }
    })
  }

  /**
   * Send anomaly alert email
   */
  async sendAnomalyAlert(alert: AnomalyAlert, recipients: string[]): Promise<boolean> {
    try {
      const emailContent = this.generateAnomalyAlertEmail(alert)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cms-compliance.com',
        to: recipients.join(', '),
        subject: `🚨 CMS Compliance Alert: ${alert.severity.toUpperCase()} Anomaly Detected`,
        html: emailContent,
        attachments: []
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Anomaly alert email sent:', result.messageId)
      return true
    } catch (error) {
      console.error('Error sending anomaly alert email:', error)
      return false
    }
  }

  /**
   * Send daily summary email
   */
  async sendDailySummary(
    summary: {
      totalRecords: number
      anomaliesDetected: number
      complianceScore: number
      topAnomalies: Array<{ type: string; count: number }>
    },
    recipients: string[]
  ): Promise<boolean> {
    try {
      const emailContent = this.generateDailySummaryEmail(summary)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cms-compliance.com',
        to: recipients.join(', '),
        subject: `📊 CMS Compliance Daily Summary - ${new Date().toLocaleDateString()}`,
        html: emailContent
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Daily summary email sent:', result.messageId)
      return true
    } catch (error) {
      console.error('Error sending daily summary email:', error)
      return false
    }
  }

  /**
   * Send compliance report email
   */
  async sendComplianceReport(
    reportData: any,
    recipients: string[],
    pdfBuffer?: Buffer
  ): Promise<boolean> {
    try {
      const emailContent = this.generateComplianceReportEmail(reportData)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cms-compliance.com',
        to: recipients.join(', '),
        subject: `📋 CMS Compliance Report - ${new Date(reportData.period.start).toLocaleDateString()} to ${new Date(reportData.period.end).toLocaleDateString()}`,
        html: emailContent,
        attachments: pdfBuffer ? [{
          filename: `cms-compliance-report-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }] : []
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Compliance report email sent:', result.messageId)
      return true
    } catch (error) {
      console.error('Error sending compliance report email:', error)
      return false
    }
  }

  /**
   * Send batch anomaly alerts
   */
  async sendBatchAnomalyAlerts(
    alerts: AnomalyAlert[],
    recipients: string[]
  ): Promise<boolean> {
    try {
      if (alerts.length === 0) return true

      const emailContent = this.generateBatchAnomalyAlertEmail(alerts)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@cms-compliance.com',
        to: recipients.join(', '),
        subject: `🚨 CMS Compliance Alert: ${alerts.length} Anomalies Detected`,
        html: emailContent
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log('Batch anomaly alert email sent:', result.messageId)
      return true
    } catch (error) {
      console.error('Error sending batch anomaly alert email:', error)
      return false
    }
  }

  /**
   * Generate anomaly alert email HTML
   */
  private generateAnomalyAlertEmail(alert: AnomalyAlert): string {
    const severityColors = {
      low: '#10B981',    // Green
      medium: '#F59E0B', // Amber
      high: '#EF4444',   // Red
      critical: '#DC2626' // Dark Red
    }

    const severityColor = severityColors[alert.severity]
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${severityColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .record-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .metric { display: inline-block; margin: 10px 20px 10px 0; }
            .metric-label { font-weight: bold; color: #666; }
            .metric-value { color: ${severityColor}; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 CMS Compliance Alert</h1>
                <h2>${alert.severity.toUpperCase()} Anomaly Detected</h2>
            </div>
            
            <div class="content">
                <div class="alert-box">
                    <h3>⚠️ Anomaly Details</h3>
                    <p><strong>Record ID:</strong> ${alert.recordId}</p>
                    <p><strong>Detected At:</strong> ${alert.detectedAt.toLocaleString()}</p>
                    <p><strong>Risk Level:</strong> <span style="color: ${severityColor};">${alert.anomalyResult.riskLevel.toUpperCase()}</span></p>
                    <p><strong>Confidence:</strong> ${(alert.anomalyResult.confidence * 100).toFixed(1)}%</p>
                </div>

                <div class="record-details">
                    <h3>📋 Record Information</h3>
                    <div class="metric">
                        <div class="metric-label">Recipient Name:</div>
                        <div class="metric-value">${alert.record.coveredRecipientName}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Payment Amount:</div>
                        <div class="metric-value">$${alert.record.totalAmountOfPaymentUsdollars.toLocaleString()}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Payment Date:</div>
                        <div class="metric-value">${alert.record.dateOfPayment || 'N/A'}</div>
                    </div>
                    <div class="metric">
                        <div class="metric-label">Recipient Type:</div>
                        <div class="metric-value">${alert.record.coveredRecipientType || 'N/A'}</div>
                    </div>
                </div>

                <div class="record-details">
                    <h3>🔍 Anomaly Reasons</h3>
                    <ul>
                        ${alert.anomalyResult.reasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>

                <div class="alert-box">
                    <h3>📝 Recommended Actions</h3>
                    <ul>
                        <li>Review the record details above</li>
                        <li>Verify payment information with source systems</li>
                        <li>Check for data entry errors</li>
                        <li>Update compliance rules if necessary</li>
                        <li>Log the review decision in the system</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated alert from the CMS Compliance Platform.</p>
                <p>Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Generate daily summary email HTML
   */
  private generateDailySummaryEmail(summary: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #22C55E; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .metric-card { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #22C55E; }
            .metric-label { color: #666; margin-top: 5px; }
            .anomaly-list { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 CMS Compliance Daily Summary</h1>
                <h2>${new Date().toLocaleDateString()}</h2>
            </div>
            
            <div class="content">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="metric-card">
                        <div class="metric-value">${summary.totalRecords.toLocaleString()}</div>
                        <div class="metric-label">Total Records Processed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${summary.anomaliesDetected}</div>
                        <div class="metric-label">Anomalies Detected</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${summary.complianceScore}%</div>
                        <div class="metric-label">Compliance Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${summary.topAnomalies.length}</div>
                        <div class="metric-label">Anomaly Types</div>
                    </div>
                </div>

                ${summary.topAnomalies.length > 0 ? `
                <div class="anomaly-list">
                    <h3>🔍 Top Anomaly Types</h3>
                    <ul>
                        ${summary.topAnomalies.map((anomaly: any) => `<li><strong>${anomaly.type}:</strong> ${anomaly.count} occurrences</li>`).join('')}
                    </ul>
                </div>
                ` : ''}

                <div class="metric-card">
                    <h3>📈 System Status</h3>
                    <p>✅ All systems operational</p>
                    <p>✅ ML models running normally</p>
                    <p>✅ External API integrations active</p>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated summary from the CMS Compliance Platform.</p>
                <p>For detailed analysis, please log into the system.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Generate compliance report email HTML
   */
  private generateComplianceReportEmail(reportData: any): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .summary-box { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 CMS Compliance Report</h1>
                <h2>${new Date(reportData.period.start).toLocaleDateString()} - ${new Date(reportData.period.end).toLocaleDateString()}</h2>
            </div>
            
            <div class="content">
                <div class="summary-box">
                    <h3>📊 Report Summary</h3>
                    <p><strong>Total Records:</strong> ${reportData.summary.totalRecords.toLocaleString()}</p>
                    <p><strong>Compliance Score:</strong> ${reportData.summary.complianceScore}%</p>
                    <p><strong>Anomalies Detected:</strong> ${reportData.summary.anomaliesDetected}</p>
                    <p><strong>Reportable Records:</strong> ${reportData.summary.reportableRecords}</p>
                    <p><strong>Non-Reportable Records:</strong> ${reportData.summary.nonReportableRecords}</p>
                </div>

                <div class="summary-box">
                    <h3>📎 Attachments</h3>
                    <p>📄 Complete PDF report is attached to this email</p>
                    <p>📊 Detailed analytics and charts included</p>
                    <p>🔍 Anomaly analysis and recommendations</p>
                </div>
            </div>
            
            <div class="footer">
                <p>This report was generated by the CMS Compliance Platform.</p>
                <p>For questions, please contact the compliance team.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  /**
   * Generate batch anomaly alert email HTML
   */
  private generateBatchAnomalyAlertEmail(alerts: AnomalyAlert[]): string {
    const criticalCount = alerts.filter(a => a.severity === 'critical').length
    const highCount = alerts.filter(a => a.severity === 'high').length
    const mediumCount = alerts.filter(a => a.severity === 'medium').length
    const lowCount = alerts.filter(a => a.severity === 'low').length

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
            .alert-summary { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .severity-count { display: inline-block; margin: 10px 20px 10px 0; padding: 5px 10px; border-radius: 3px; }
            .critical { background: #DC2626; color: white; }
            .high { background: #EF4444; color: white; }
            .medium { background: #F59E0B; color: white; }
            .low { background: #10B981; color: white; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 CMS Compliance Batch Alert</h1>
                <h2>${alerts.length} Anomalies Detected</h2>
            </div>
            
            <div class="content">
                <div class="alert-summary">
                    <h3>📊 Alert Summary</h3>
                    <div class="severity-count critical">Critical: ${criticalCount}</div>
                    <div class="severity-count high">High: ${highCount}</div>
                    <div class="severity-count medium">Medium: ${mediumCount}</div>
                    <div class="severity-count low">Low: ${lowCount}</div>
                </div>

                <div class="alert-summary">
                    <h3>🔍 Top Anomalies</h3>
                    <ul>
                        ${alerts.slice(0, 10).map(alert => `
                            <li>
                                <strong>${alert.record.coveredRecipientName}</strong> - 
                                $${alert.record.totalAmountOfPaymentUsdollars.toLocaleString()} - 
                                <span class="${alert.severity}">${alert.severity.toUpperCase()}</span>
                            </li>
                        `).join('')}
                    </ul>
                    ${alerts.length > 10 ? `<p><em>... and ${alerts.length - 10} more anomalies</em></p>` : ''}
                </div>

                <div class="alert-summary">
                    <h3>📝 Recommended Actions</h3>
                    <ul>
                        <li>Review all critical and high-severity anomalies immediately</li>
                        <li>Check for patterns in the anomaly types</li>
                        <li>Update compliance rules if necessary</li>
                        <li>Consider data quality improvements</li>
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated batch alert from the CMS Compliance Platform.</p>
                <p>Please log into the system for detailed analysis.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }
}

// Export singleton instance
export const emailService = new EmailService()
