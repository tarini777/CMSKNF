import { CMSRecord } from '@/types/cms'
import type { ReportabilityAnalysis, ReportabilityRule } from '@/lib/glossary-service'
import { glossaryService } from '@/lib/glossary-service'
import {
  buildCmsOfficialGlossaryTerms,
  buildPlatformSupplementGlossaryTerms,
} from '@/lib/cms-glossary-mapper'
import {
  listRegistryEntries,
  resolveRuleEntry,
  seedCmsRuleRegistry,
  type RuleRegistryEntry,
} from '@/lib/rule-registry'
import { describeRecipientLocation } from '@/lib/geographic-rules'
import { prisma } from '@/lib/prisma'

export interface ResolvedRuleCitation {
  ruleId: string
  name: string
  description: string
  regulatoryBasis: string
  cfrSection?: string
  cmsUrl?: string
  category: string
  result: string
  source: RuleRegistryEntry['source']
  jurisdiction?: string
  companyRuleName?: string
}

export interface GlossaryMatchCitation {
  termId: string
  term: string
  definition: string
  reportability: string
  regulatoryBasis?: string
}

export interface RecordRuleCitations {
  appliedRuleIds: string[]
  resolvedRules: ResolvedRuleCitation[]
  glossaryMatches: GlossaryMatchCitation[]
  unresolvedRuleIds: string[]
  rulesEngineVersion?: string
  ruleInputSnapshot?: unknown
}

let catalogInitialized = false

function ensureCatalog(cmsRules: ReportabilityRule[]): Map<string, RuleRegistryEntry> {
  if (!catalogInitialized) {
    seedCmsRuleRegistry(cmsRules)
    catalogInitialized = true
  }
  const entries = listRegistryEntries()
  return new Map(entries.map((e) => [e.id, e]))
}

export function buildGlossaryMatchesForRecord(
  record: CMSRecord
): ReportabilityAnalysis['glossaryMatches'] {
  const glossaryTerms = [...buildCmsOfficialGlossaryTerms(), ...buildPlatformSupplementGlossaryTerms()]
  const natureOfPayment = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
  const location = describeRecipientLocation(record)

  const searchText = [
    natureOfPayment,
    record.coveredRecipientName,
    record.coveredRecipientType,
    record.recipientCountry,
    record.countryOfTravel,
    record.formOfPaymentOrTransferOfValue,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const relevantTermIds = new Set<string>()
  if (location.isForeignRecipient) {
    relevantTermIds.add('international_recipient_reporting')
    relevantTermIds.add('recipient_country_field')
  }
  if (location.isTravelOutsideUs) relevantTermIds.add('country_of_travel')
  if (record.recipientState && ['PR', 'GU', 'VI', 'AS', 'MP'].includes(record.recipientState.toUpperCase())) {
    relevantTermIds.add('us_territory_recipient')
  }

  if (natureOfPayment.includes('travel') || natureOfPayment.includes('lodging')) {
    relevantTermIds.add('country_of_travel')
  }
  if (natureOfPayment.includes('consulting') || natureOfPayment.includes('advisory')) {
    relevantTermIds.add('cms_natures_of_payment')
  }

  const matches: ReportabilityAnalysis['glossaryMatches'] = []
  glossaryTerms
    .filter(
      (term) =>
        relevantTermIds.has(term.id) || searchText.includes(term.term.toLowerCase())
    )
    .slice(0, 8)
    .forEach((term) => {
      matches.push({
        term: term.term,
        definition: term.definition,
        reportability: term.reportability,
      })
    })

  return matches
}

function parseAppliedRuleIds(appliedRules: unknown): string[] {
  if (Array.isArray(appliedRules)) {
    return appliedRules.filter((r): r is string => typeof r === 'string')
  }
  return []
}

async function resolveCompanyRuleNames(ruleIds: string[]): Promise<Map<string, string>> {
  const companyIds = ruleIds
    .filter((id) => id.startsWith('company_rule:'))
    .map((id) => id.replace('company_rule:', ''))

  if (companyIds.length === 0) return new Map()

  const rules = await prisma.companyRule.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true, description: true },
  })

  return new Map(rules.map((r) => [r.id, r.name]))
}

export async function resolveRuleCitations(
  ruleIds: string[],
  cmsCatalog?: Map<string, RuleRegistryEntry>
): Promise<{ resolved: ResolvedRuleCitation[]; unresolved: string[] }> {
  const cmsRules = await glossaryService.getReportabilityRules()
  const catalog = cmsCatalog ?? ensureCatalog(cmsRules)
  const companyNames = await resolveCompanyRuleNames(ruleIds)

  const resolved: ResolvedRuleCitation[] = []
  const unresolved: string[] = []

  for (const ruleId of [...new Set(ruleIds)]) {
    const entry = resolveRuleEntry(ruleId, catalog)
    if (!entry) {
      unresolved.push(ruleId)
      continue
    }

    const companyId = ruleId.startsWith('company_rule:') ? ruleId.replace('company_rule:', '') : undefined

    resolved.push({
      ruleId,
      name: companyId && companyNames.get(companyId) ? companyNames.get(companyId)! : entry.name,
      description: entry.description,
      regulatoryBasis: entry.regulatoryBasis,
      cfrSection: entry.cfrSection,
      cmsUrl: entry.cmsUrl,
      category: entry.category,
      result: entry.result,
      source: entry.source,
      jurisdiction: entry.jurisdiction,
      companyRuleName: companyId ? companyNames.get(companyId) : undefined,
    })
  }

  return { resolved, unresolved }
}

export async function buildRecordRuleCitations(
  record: CMSRecord & {
    appliedRules?: unknown
    spendEvent?: {
      rulesEngineVersion?: string | null
      ruleInputSnapshot?: unknown
    } | null
  }
): Promise<RecordRuleCitations> {
  const appliedRuleIds = parseAppliedRuleIds(record.appliedRules)
  const glossaryMatchesRaw = buildGlossaryMatchesForRecord(record)
  const glossaryTerms = [...buildCmsOfficialGlossaryTerms(), ...buildPlatformSupplementGlossaryTerms()]

  const glossaryMatches: GlossaryMatchCitation[] = glossaryMatchesRaw.map((m) => {
    const term = glossaryTerms.find((t) => t.term === m.term)
    return {
      termId: term?.id ?? m.term,
      term: m.term,
      definition: m.definition,
      reportability: m.reportability,
      regulatoryBasis: term?.regulatoryBasis,
    }
  })

  const { resolved, unresolved } = await resolveRuleCitations(appliedRuleIds)

  return {
    appliedRuleIds,
    resolvedRules: resolved,
    glossaryMatches,
    unresolvedRuleIds: unresolved,
    rulesEngineVersion: record.spendEvent?.rulesEngineVersion ?? undefined,
    ruleInputSnapshot: record.spendEvent?.ruleInputSnapshot ?? undefined,
  }
}

export async function getTransparencyRuleRegistry(): Promise<RuleRegistryEntry[]> {
  const cmsRules = await glossaryService.getReportabilityRules()
  ensureCatalog(cmsRules)
  return listRegistryEntries()
}
