/**
 * Multi-currency normalization for threshold evaluation (COM-TRANSP REQ-008/011).
 * Uses static rates; replace with live FX API in production.
 */
const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  CAD: 0.74,
  CHF: 1.12,
  AUD: 0.65,
  JPY: 0.0067,
  MXN: 0.058,
  BRL: 0.19,
}

export interface NormalizedAmount {
  paymentCurrency: string
  originalAmount: number
  exchangeRate: number
  amountUsd: number
}

export function normalizePaymentAmount(
  amount: number,
  currency?: string | null
): NormalizedAmount {
  const paymentCurrency = (currency || 'USD').toUpperCase().trim()
  const rate = USD_RATES[paymentCurrency] ?? 1
  const amountUsd = paymentCurrency === 'USD' ? amount : amount * rate

  return {
    paymentCurrency,
    originalAmount: amount,
    exchangeRate: rate,
    amountUsd: Math.round(amountUsd * 100) / 100,
  }
}

export function amountMeetsThreshold(amountUsd: number, thresholdUsd: number): boolean {
  return amountUsd >= thresholdUsd
}

export function amountMeetsEurThreshold(amountUsd: number, thresholdEur: number): boolean {
  const eurToUsd = USD_RATES.EUR
  return amountUsd >= thresholdEur * eurToUsd
}

export { USD_RATES }
