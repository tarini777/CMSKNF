import { prisma } from '@/lib/prisma'
import { CMSRecord, CompanyRule } from '@/types/cms'
import { ReportabilityAnalysis } from '@/lib/glossary-service'

type RuleEffect = 'reportable' | 'non_reportable'

interface RuleCondition {
  field?: string
  operator?: string
  value?: unknown
  logicalOperator?: 'AND' | 'OR'
}

function getFieldValue(record: CMSRecord, field: string): unknown {
  const key = field as keyof CMSRecord
  return record[key]
}

function evaluateCondition(record: CMSRecord, condition: RuleCondition): boolean {
  const field = condition.field || 'totalAmountOfPaymentUsdollars'
  const operator = condition.operator || 'greater_than'
  const raw = getFieldValue(record, field)
  const value = condition.value

  switch (operator) {
    case 'equals':
      return String(raw).toLowerCase() === String(value).toLowerCase()
    case 'not_equals':
      return String(raw).toLowerCase() !== String(value).toLowerCase()
    case 'greater_than':
      return Number(raw) > Number(value)
    case 'less_than':
      return Number(raw) < Number(value)
    case 'greater_than_or_equal':
      return Number(raw) >= Number(value)
    case 'less_than_or_equal':
      return Number(raw) <= Number(value)
    case 'contains':
      return String(raw).toLowerCase().includes(String(value).toLowerCase())
    case 'not_contains':
      return !String(raw).toLowerCase().includes(String(value).toLowerCase())
    case 'in':
      return Array.isArray(value) && value.map(String).includes(String(raw))
    case 'not_in':
      return Array.isArray(value) && !value.map(String).includes(String(raw))
    default:
      return false
  }
}

function parseConditions(conditions: unknown): RuleCondition[] {
  if (!conditions || typeof conditions !== 'object') return []
  const obj = conditions as Record<string, unknown>
  if (Array.isArray(obj.conditions)) {
    return obj.conditions as RuleCondition[]
  }
  if (obj.field || obj.operator || obj.value !== undefined) {
    return [obj as RuleCondition]
  }
  if (typeof obj.minAmount === 'number') {
    return [{ field: 'totalAmountOfPaymentUsdollars', operator: 'greater_than_or_equal', value: obj.minAmount }]
  }
  if (typeof obj.maxAmount === 'number') {
    return [{ field: 'totalAmountOfPaymentUsdollars', operator: 'less_than', value: obj.maxAmount }]
  }
  if (typeof obj.natureOfPaymentContains === 'string') {
    return [
      {
        field: 'natureOfPaymentOrTransferOfValue',
        operator: 'contains',
        value: obj.natureOfPaymentContains,
      },
    ]
  }
  return []
}

function ruleEffect(rule: CompanyRule): RuleEffect | null {
  if (rule.ruleType === 'exclusion') return 'non_reportable'
  if (rule.ruleType === 'inclusion' || rule.ruleType === 'threshold') return 'reportable'
  if (rule.ruleType === 'validation') return null
  return 'reportable'
}

export function evaluateCompanyRule(
  rule: CompanyRule,
  record: CMSRecord
): { matched: boolean; effect: RuleEffect | null } {
  const conditions = parseConditions(rule.conditions)
  if (conditions.length === 0) return { matched: false, effect: null }

  let matched = evaluateCondition(record, conditions[0])
  for (let i = 1; i < conditions.length; i++) {
    const condition = conditions[i]
    const result = evaluateCondition(record, condition)
    matched = condition.logicalOperator === 'OR' ? matched || result : matched && result
  }

  return { matched, effect: matched ? ruleEffect(rule) : null }
}

export async function loadActiveCompanyRules(): Promise<CompanyRule[]> {
  const rules = await prisma.companyRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
  return rules as CompanyRule[]
}

export function applyCompanyRules(
  record: CMSRecord,
  rules: CompanyRule[],
  baseAnalysis: ReportabilityAnalysis
): ReportabilityAnalysis {
  const applicableRules = [...baseAnalysis.applicableRules]
  const reasoning = [...baseAnalysis.reasoning]
  const warnings = [...baseAnalysis.warnings]
  let isReportable = baseAnalysis.isReportable
  let confidence = baseAnalysis.confidence

  for (const rule of rules) {
    const { matched, effect } = evaluateCompanyRule(rule, record)
    if (!matched || !effect) continue

    applicableRules.push(`company_rule:${rule.id}`)
    reasoning.push(`Company rule "${rule.name}": ${rule.description}`)

    if (effect === 'non_reportable') {
      isReportable = false
      confidence = Math.max(confidence, 0.9)
    } else {
      isReportable = true
      confidence = Math.max(confidence, 0.88)
    }
  }

  return {
    ...baseAnalysis,
    isReportable,
    confidence,
    applicableRules,
    reasoning,
    warnings,
  }
}

export async function analyzeRecordWithCompanyRules(
  record: CMSRecord,
  baseAnalysis: ReportabilityAnalysis
): Promise<ReportabilityAnalysis> {
  const rules = await loadActiveCompanyRules()
  if (rules.length === 0) return baseAnalysis
  return applyCompanyRules(record, rules, baseAnalysis)
}
