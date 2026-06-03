import { CMSRecord } from '@/types/cms'
import { mlService } from './ml-service'

export interface TrainingData {
  records: CMSRecord[]
  features: number[][]
  labels: number[]
  metadata: {
    totalRecords: number
    featureCount: number
    positiveSamples: number
    negativeSamples: number
    dateRange: {
      start: Date
      end: Date
    }
  }
}

export interface TrainingResult {
  success: boolean
  modelMetrics: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    confusionMatrix: number[][]
  }
  trainingTime: number
  featureImportance: Array<{
    feature: string
    importance: number
  }>
  recommendations: string[]
}

export interface ModelPerformance {
  modelId: string
  version: string
  trainedAt: Date
  performance: {
    accuracy: number
    precision: number
    recall: number
    f1Score: number
  }
  dataQuality: {
    trainingSamples: number
    validationSamples: number
    featureCount: number
  }
  isActive: boolean
}

export class MLTrainingService {
  private modelVersions: Map<string, ModelPerformance> = new Map()
  private currentModelVersion = '1.0.0'

  /**
   * Train ML model with historical data
   */
  async trainModelWithHistoricalData(
    startDate: Date,
    endDate: Date,
    options: {
      includeValidation?: boolean
      crossValidation?: boolean
      featureSelection?: boolean
      hyperparameterTuning?: boolean
    } = {}
  ): Promise<TrainingResult> {
    const startTime = Date.now()

    try {
      console.log(`🚀 Starting ML model training for period: ${startDate.toISOString()} to ${endDate.toISOString()}`)

      // Prepare training data
      const trainingData = await this.prepareTrainingData(startDate, endDate)
      
      if (trainingData.records.length < 100) {
        throw new Error('Insufficient training data. Need at least 100 records.')
      }

      console.log(`📊 Training data prepared: ${trainingData.records.length} records, ${trainingData.metadata.featureCount} features`)

      // Train the model
      await mlService.trainAnomalyDetectionModel(trainingData.records)

      // Evaluate model performance
      const modelMetrics = await this.evaluateModel(trainingData, options)

      // Calculate feature importance
      const featureImportance = this.calculateFeatureImportance(trainingData)

      // Generate recommendations
      const recommendations = this.generateTrainingRecommendations(modelMetrics, trainingData)

      const trainingTime = Date.now() - startTime

      // Store model performance
      const modelId = `model_${Date.now()}`
      const modelPerformance: ModelPerformance = {
        modelId,
        version: this.currentModelVersion,
        trainedAt: new Date(),
        performance: {
          accuracy: modelMetrics.accuracy,
          precision: modelMetrics.precision,
          recall: modelMetrics.recall,
          f1Score: modelMetrics.f1Score
        },
        dataQuality: {
          trainingSamples: trainingData.records.length,
          validationSamples: Math.floor(trainingData.records.length * 0.2),
          featureCount: trainingData.metadata.featureCount
        },
        isActive: true
      }

      this.modelVersions.set(modelId, modelPerformance)

      console.log(`✅ Model training completed in ${trainingTime}ms`)
      console.log(`📈 Model accuracy: ${(modelMetrics.accuracy * 100).toFixed(2)}%`)

      return {
        success: true,
        modelMetrics,
        trainingTime,
        featureImportance,
        recommendations
      }

    } catch (error) {
      console.error('❌ Model training failed:', error)
      return {
        success: false,
        modelMetrics: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          confusionMatrix: [[0, 0], [0, 0]]
        },
        trainingTime: Date.now() - startTime,
        featureImportance: [],
        recommendations: [`Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Prepare training data from historical records
   */
  private async prepareTrainingData(startDate: Date, endDate: Date): Promise<TrainingData> {
    // In a real implementation, this would fetch from the database
    // For now, we'll simulate historical data
    const mockRecords = this.generateMockHistoricalData(startDate, endDate)
    
    const features = mlService['extractFeatures'](mockRecords)
    const labels = mockRecords.map(record => {
      // Create labels based on known anomalies or business rules
      return this.createLabel(record)
    })

    return {
      records: mockRecords,
      features,
      labels,
      metadata: {
        totalRecords: mockRecords.length,
        featureCount: features[0]?.length || 0,
        positiveSamples: labels.filter(l => l === 1).length,
        negativeSamples: labels.filter(l => l === 0).length,
        dateRange: { start: startDate, end: endDate }
      }
    }
  }

  /**
   * Evaluate model performance
   */
  private async evaluateModel(trainingData: TrainingData, options: any): Promise<TrainingResult['modelMetrics']> {
    // Simulate model evaluation
    // In a real implementation, this would use proper ML evaluation metrics
    
    const accuracy = 0.85 + Math.random() * 0.1 // 85-95% accuracy
    const precision = 0.80 + Math.random() * 0.15 // 80-95% precision
    const recall = 0.75 + Math.random() * 0.20 // 75-95% recall
    const f1Score = 2 * (precision * recall) / (precision + recall)

    // Simulate confusion matrix
    const totalSamples = trainingData.records.length
    const truePositives = Math.floor(totalSamples * 0.1 * recall)
    const falsePositives = Math.floor(totalSamples * 0.1 * (1 - precision))
    const trueNegatives = Math.floor(totalSamples * 0.9 * accuracy)
    const falseNegatives = Math.floor(totalSamples * 0.1 * (1 - recall))

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix: [
        [trueNegatives, falsePositives],
        [falseNegatives, truePositives]
      ]
    }
  }

  /**
   * Calculate feature importance
   */
  private calculateFeatureImportance(trainingData: TrainingData): Array<{ feature: string; importance: number }> {
    const featureNames = [
      'Payment Amount',
      'Payment Date',
      'Recipient Type',
      'Payment Form',
      'Payment Nature',
      'Physician Specialty',
      'Recipient State',
      'Physician Type',
      'Reportability',
      'Record Completeness'
    ]

    // Simulate feature importance calculation
    return featureNames.map((name, index) => ({
      feature: name,
      importance: Math.random() * 0.3 + 0.1 // 10-40% importance
    })).sort((a, b) => b.importance - a.importance)
  }

  /**
   * Generate training recommendations
   */
  private generateTrainingRecommendations(metrics: TrainingResult['modelMetrics'], trainingData: TrainingData): string[] {
    const recommendations: string[] = []

    if (metrics.accuracy < 0.8) {
      recommendations.push('Model accuracy is below 80%. Consider collecting more training data or feature engineering.')
    }

    if (metrics.precision < 0.75) {
      recommendations.push('Low precision indicates high false positive rate. Review anomaly detection thresholds.')
    }

    if (metrics.recall < 0.70) {
      recommendations.push('Low recall indicates high false negative rate. Consider adjusting model sensitivity.')
    }

    if (trainingData.metadata.positiveSamples < trainingData.metadata.totalRecords * 0.1) {
      recommendations.push('Limited positive samples. Consider data augmentation or synthetic data generation.')
    }

    if (trainingData.metadata.totalRecords < 1000) {
      recommendations.push('Training dataset is small. Collect more historical data for better model performance.')
    }

    if (recommendations.length === 0) {
      recommendations.push('Model performance is satisfactory. Continue monitoring with new data.')
    }

    return recommendations
  }

  /**
   * Get model performance history
   */
  getModelPerformanceHistory(): ModelPerformance[] {
    return Array.from(this.modelVersions.values()).sort((a, b) => 
      b.trainedAt.getTime() - a.trainedAt.getTime()
    )
  }

  /**
   * Get current model performance
   */
  getCurrentModelPerformance(): ModelPerformance | null {
    const activeModels = Array.from(this.modelVersions.values()).filter(m => m.isActive)
    return activeModels.length > 0 ? activeModels[0] : null
  }

  /**
   * Retrain model with new data
   */
  async retrainModel(newData: CMSRecord[]): Promise<TrainingResult> {
    const startTime = Date.now()

    try {
      console.log(`🔄 Retraining model with ${newData.length} new records`)

      // Combine with existing model data
      const allRecords = [...newData] // In real implementation, combine with existing data
      
      // Train updated model
      await mlService.trainAnomalyDetectionModel(allRecords)

      // Evaluate performance
      const trainingData = {
        records: allRecords,
        features: mlService['extractFeatures'](allRecords),
        labels: allRecords.map(r => this.createLabel(r)),
        metadata: {
          totalRecords: allRecords.length,
          featureCount: 10,
          positiveSamples: allRecords.filter(r => this.createLabel(r) === 1).length,
          negativeSamples: allRecords.filter(r => this.createLabel(r) === 0).length,
          dateRange: { start: new Date(), end: new Date() }
        }
      }

      const modelMetrics = await this.evaluateModel(trainingData, {})
      const featureImportance = this.calculateFeatureImportance(trainingData)
      const recommendations = this.generateTrainingRecommendations(modelMetrics, trainingData)

      // Update model version
      this.currentModelVersion = this.incrementVersion(this.currentModelVersion)

      return {
        success: true,
        modelMetrics,
        trainingTime: Date.now() - startTime,
        featureImportance,
        recommendations
      }

    } catch (error) {
      console.error('❌ Model retraining failed:', error)
      return {
        success: false,
        modelMetrics: {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          confusionMatrix: [[0, 0], [0, 0]]
        },
        trainingTime: Date.now() - startTime,
        featureImportance: [],
        recommendations: [`Retraining failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Generate mock historical data for training
   */
  private generateMockHistoricalData(startDate: Date, endDate: Date): CMSRecord[] {
    const records: CMSRecord[] = []
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const recordsPerDay = Math.floor(1000 / daysDiff) // ~1000 records total

    for (let day = 0; day < daysDiff; day++) {
      const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000)
      
      for (let i = 0; i < recordsPerDay; i++) {
        const record: CMSRecord = {
          id: `rec_${day}_${i}`,
          recordId: `REC_${Date.now()}_${i}`,
          coveredRecipientId: `RECIPIENT_${Math.floor(Math.random() * 1000)}`,
          coveredRecipientName: `Dr. ${this.getRandomName()}`,
          coveredRecipientType: this.getRandomRecipientType(),
          totalAmountOfPaymentUsdollars: this.getRandomPaymentAmount(),
          dateOfPayment: currentDate.toISOString().split('T')[0],
          formOfPaymentOrTransferOfValue: this.getRandomPaymentForm(),
          natureOfPaymentOrTransferOfValue: this.getRandomPaymentNature(),
          physicianSpecialty: this.getRandomSpecialty(),
          recipientState: this.getRandomState(),
          isReportable: Math.random() > 0.3, // 70% reportable
          humanDecision: 'pending',
          createdAt: currentDate,
          updatedAt: currentDate
        } as CMSRecord

        records.push(record)
      }
    }

    return records
  }

  /**
   * Create label for training (1 = anomaly, 0 = normal)
   */
  private createLabel(record: CMSRecord): number {
    // Simple rule-based labeling for training
    if (record.totalAmountOfPaymentUsdollars > 50000) return 1 // High amount
    if (!record.coveredRecipientName) return 1 // Missing name
    if (record.totalAmountOfPaymentUsdollars < 0) return 1 // Negative amount
    if (!record.dateOfPayment) return 1 // Missing date
    return 0 // Normal
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.').map(Number)
    parts[2] += 1 // Increment patch version
    return parts.join('.')
  }

  // Helper methods for generating mock data
  private getRandomName(): string {
    const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']
    return names[Math.floor(Math.random() * names.length)]
  }

  private getRandomRecipientType(): string {
    const types = ['Individual', 'Group Practice', 'Hospital', 'Teaching Hospital', 'Unknown']
    return types[Math.floor(Math.random() * types.length)]
  }

  private getRandomPaymentAmount(): number {
    return Math.floor(Math.random() * 100000) + 10
  }

  private getRandomPaymentForm(): string {
    const forms = ['Cash or cash equivalent', 'In-kind items and services', 'Stock, stock option, or any other ownership interest']
    return forms[Math.floor(Math.random() * forms.length)]
  }

  private getRandomPaymentNature(): string {
    const natures = ['Consulting fee', 'Honoraria', 'Gift', 'Travel and lodging', 'Education']
    return natures[Math.floor(Math.random() * natures.length)]
  }

  private getRandomSpecialty(): string {
    const specialties = ['Cardiology', 'Oncology', 'Neurology', 'Orthopedics', 'Internal Medicine']
    return specialties[Math.floor(Math.random() * specialties.length)]
  }

  private getRandomState(): string {
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA']
    return states[Math.floor(Math.random() * states.length)]
  }
}

// Export singleton instance
export const mlTrainingService = new MLTrainingService()
