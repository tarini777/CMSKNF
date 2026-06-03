declare module 'ml-isolation-forest' {
  export class IsolationForest {
    constructor(options?: {
      nEstimators?: number
      maxSamples?: number
      contamination?: number
      randomState?: number
    })
    fit(data: number[][] | unknown): void
    train(data: number[][] | unknown): void
    predict(data: number[][] | unknown): number[]
    decisionFunction(data: number[][] | unknown): number[]
  }
}
