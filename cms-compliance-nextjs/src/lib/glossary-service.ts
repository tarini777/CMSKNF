import { CMSRecord } from '@/types/cms'
import {
  describeRecipientLocation,
  isOutsideUnitedStates,
  isUnitedStatesCountry,
  isValidUsStateOrTerritory,
} from '@/lib/geographic-rules'
import { internationalComplianceService } from '@/lib/international-compliance-service'

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category: 'payment_type' | 'recipient_type' | 'product_type' | 'compliance_term' | 'regulatory_term'
  reportability: 'reportable' | 'non_reportable' | 'conditional' | 'exempt'
  conditions?: string[]
  examples?: string[]
  regulatoryBasis?: string
  lastUpdated: string
  version: string
}

export interface ReportabilityRule {
  id: string
  name: string
  description: string
  category: 'amount_threshold' | 'payment_type' | 'recipient_type' | 'product_type' | 'geographic' | 'temporal' | 'regulatory_term'
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in'
    value: any
    logicalOperator?: 'AND' | 'OR'
  }[]
  result: 'reportable' | 'non_reportable' | 'conditional'
  priority: number
  effectiveDate: string
  expirationDate?: string
  regulatoryBasis: string
  lastUpdated: string
}

export interface ReportabilityAnalysis {
  isReportable: boolean
  confidence: number
  applicableRules: string[]
  reasoning: string[]
  warnings: string[]
  recommendations: string[]
  glossaryMatches: {
    term: string
    definition: string
    reportability: string
  }[]
  jurisdictionAnalysis?: import('@/lib/international-compliance-service').MultiJurisdictionReport
}

export interface ComplianceCheck {
  record: CMSRecord
  analysis: ReportabilityAnalysis
  timestamp: string
  checkedBy: string
}

export class GlossaryService {
  private readonly API_BASE = '/api/glossary'
  private glossaryTerms: GlossaryTerm[] = []
  private reportabilityRules: ReportabilityRule[] = []

  constructor() {
    this.initializeDefaultGlossary()
    this.initializeDefaultRules()
  }

  /**
   * Initialize official CMS Open Payments glossary terms based on 21 CFR and CMS definitions
   */
  private initializeDefaultGlossary(): void {
    this.glossaryTerms = [
      // Official CMS Nature of Payment Categories
      {
        id: 'acquisitions',
        term: 'Acquisitions',
        definition: 'Buyout payments made to covered recipients who have ownership interest in a company that has been acquired',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Year 2021+', 'Ownership interest in acquired company'],
        examples: ['Company buyout payments', 'Acquisition-related payments'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'charitable_contribution',
        term: 'Charitable Contribution',
        definition: 'A payment or transfer of value made to an organization with tax-exempt status under the Internal Revenue Code of 1986',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Tax-exempt organization', 'Not covered by other categories'],
        examples: ['Donations to medical foundations', 'Charitable grants'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compensation_services_other',
        term: 'Compensation for services other than consulting, including serving as faculty or as a speaker at an event other than a continuing education program',
        definition: 'Payments for services other than consulting, including faculty or speaker roles at non-continuing education events',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Services other than consulting'],
        examples: ['Faculty compensation', 'Speaker fees for non-CME events'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compensation_faculty_speaker_accredited',
        term: 'Compensation for serving as faculty or as a speaker for an accredited or certified continuing education program',
        definition: 'Compensation for serving as faculty or as a speaker for an accredited or certified continuing education program (Program Years 2013-2020)',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Years 2013-2020', 'Accredited/certified CME program'],
        examples: ['ACCME accredited programs', 'Certified continuing education'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compensation_faculty_speaker_non_accredited',
        term: 'Compensation for serving as faculty or as a speaker for a non-accredited and non-certified continuing education program',
        definition: 'Compensation for serving as faculty or as a speaker for a non-accredited and non-certified continuing education program (Program Years 2013-2020)',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Years 2013-2020', 'Non-accredited/non-certified program'],
        examples: ['Industry-sponsored programs', 'Non-certified education'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compensation_faculty_speaker_medical_education',
        term: 'Compensation for serving as faculty or as a speaker for medical education program',
        definition: 'Beginning with Program Year 2021, accredited/certified and unaccredited/non-certified continuing education program categories are combined',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Year 2021+', 'Medical education program'],
        examples: ['CME programs', 'Medical education presentations'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'consulting_fee',
        term: 'Consulting Fee',
        definition: 'A payment that a company makes to a physician for advice and expertise about a medical product or treatment',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Written agreement', 'Business needs'],
        examples: ['Advisory board participation', 'Expert consultation', 'Product development advice'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'current_prospective_ownership',
        term: 'Current or prospective ownership or investment interest',
        definition: 'Ownership or investment interest currently held by physicians and teaching hospitals, as well as ownership or investment interest that could potentially be held',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Any amount', 'Stock, options, partnerships, LLC membership'],
        examples: ['Stock ownership', 'Stock options', 'Partnership shares', 'LLC membership'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'debt_forgiveness',
        term: 'Debt Forgiveness',
        definition: 'Forgiving the debt of a covered recipient, a physician owner, or the immediate family of the physician',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Year 2021+', 'Debt forgiveness'],
        examples: ['Loan forgiveness', 'Debt cancellation'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'education',
        term: 'Education',
        definition: 'Payments or transfers of value for classes, activities, programs, or events that involve learning or teaching a profession skill',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Educational content'],
        examples: ['Textbooks', 'Medical journal articles', 'Educational materials'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'entertainment',
        term: 'Entertainment',
        definition: 'Attendance at recreational, cultural, sporting or other events that would generally have a cost',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Recreational/cultural/sporting events'],
        examples: ['Concert tickets', 'Sporting event tickets', 'Cultural events'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'food_beverage',
        term: 'Food and Beverage',
        definition: 'Food and beverage',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Food and beverage provided'],
        examples: ['Meals', 'Snacks', 'Beverages'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'gift',
        term: 'Gift',
        definition: 'A general category which includes anything a reporting entity provides to a covered recipient that does not fit into another Nature of Payment category',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Does not fit other categories'],
        examples: ['Promotional items', 'General gifts'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'grant',
        term: 'Grant',
        definition: 'A payment to a covered recipient to support a specific cause or activity',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Specific cause or activity'],
        examples: ['Research grants', 'Educational grants', 'Program support'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'honoraria',
        term: 'Honoraria',
        definition: 'Similar to consulting fees, but generally reserved for a brief, one-time activity without a set price',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Brief one-time activity'],
        examples: ['One-time speaking fees', 'Brief consultation honoraria'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'long_term_medical_supply_loan',
        term: 'Long-term medical supply or device loan',
        definition: 'The loan of supplies or a device for a total of 91 days or longer, regardless of whether the loan was 90 consecutive days',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Program Year 2021+', '91+ days loan period'],
        examples: ['Medical device loans', 'Supply loans'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'royalty_license',
        term: 'Royalty or License',
        definition: 'Payments based on sales of products that use a physician\'s intellectual property',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Intellectual property based'],
        examples: ['Patent royalties', 'License fees', 'IP-based payments'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'space_rental_facility_fees',
        term: 'Space rental or facility fees',
        definition: 'Payments or fees associated with renting a space or facility (Teaching Hospital covered recipients only)',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Teaching Hospital only', 'Space or facility rental'],
        examples: ['Conference room rental', 'Facility usage fees'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'travel_lodging',
        term: 'Travel and Lodging',
        definition: 'Any compensation for costs associated with travel, such as hotel fees, airfare, mileage, and cab fare',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Travel-related costs'],
        examples: ['Airfare', 'Hotel fees', 'Mileage', 'Cab fare'],
        regulatoryBasis: '42 CFR 403.904(e)(2)',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_consulting',
        term: 'Consulting Fee',
        definition: 'Payments for professional services, advice, or expertise provided by healthcare professionals',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Services provided to manufacturer'],
        examples: ['Advisory board participation', 'Expert consultation', 'Professional services'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_speaking',
        term: 'Speaking Fee',
        definition: 'Payments for educational presentations, lectures, or speaking engagements',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Educational content related to manufacturer products'],
        examples: ['Medical education presentations', 'Conference lectures', 'Training sessions'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_travel',
        term: 'Travel and Lodging',
        definition: 'Payments for transportation, lodging, and meals related to business activities',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Business purpose', 'Related to manufacturer activities'],
        examples: ['Airfare', 'Hotel accommodations', 'Meals during business travel'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_food',
        term: 'Food and Beverage',
        definition: 'Payments for meals, snacks, and beverages provided to healthcare professionals',
        category: 'payment_type',
        reportability: 'conditional',
        conditions: ['Amount > $10', 'Educational content provided', 'Not part of larger meal'],
        examples: ['Lunch during educational presentation', 'Coffee during meeting', 'Dinner at conference'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_gift',
        term: 'Gift',
        definition: 'Items of value given to healthcare professionals without expectation of services',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Value > $10', 'Given to physician or teaching hospital'],
        examples: ['Medical textbooks', 'Educational materials', 'Promotional items'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_education',
        term: 'Educational Support',
        definition: 'Payments for continuing medical education, training, or professional development',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Educational content', 'Beneficiary is physician or teaching hospital'],
        examples: ['CME course fees', 'Conference registration', 'Training program costs'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_royalty',
        term: 'Royalty or License Fee',
        definition: 'Payments for intellectual property rights, patents, or licensing agreements',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Amount > $10', 'Intellectual property related', 'Beneficiary is physician or teaching hospital'],
        examples: ['Patent royalties', 'License fees', 'Intellectual property payments'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'payment_ownership',
        term: 'Ownership or Investment Interest',
        definition: 'Equity interests, stock options, or other ownership stakes in manufacturers',
        category: 'payment_type',
        reportability: 'reportable',
        conditions: ['Any amount', 'Ownership interest in manufacturer'],
        examples: ['Stock ownership', 'Equity interests', 'Investment stakes'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },

      // Official CMS Covered Recipient Definitions
      {
        id: 'covered_recipient_physician',
        term: 'Physician',
        definition: 'For the purposes of Open Payments, a "physician" is any of the following types of professionals that are legally authorized by the state to practice, regardless of whether they are Medicare, Medicaid, or CHIP providers: Doctors of Medicine or Osteopathic Medicine, Doctors of Dental Medicine or Dental Surgery, Doctors of Podiatric Medicine, Doctors of Optometry, Chiropractors. Note: Medical residents are excluded.',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Legally authorized by state', 'Not a medical resident', 'Not a bona fide employee of reporting entity'],
        examples: ['MD', 'DO', 'DDS', 'DMD', 'DPM', 'OD', 'DC'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_physician_assistant',
        term: 'Physician Assistant',
        definition: 'A physician assistant who performs such services as such individual is legally authorized to perform (in the State in which the individual performs such services) in accordance with State law, and who meets such training, education, and experience requirements as the Secretary may prescribe in regulations',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Legally authorized by state', 'Meets training/education requirements', 'Not a bona fide employee of reporting entity'],
        examples: ['PA', 'Physician Assistant'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_nurse_practitioner',
        term: 'Nurse Practitioner',
        definition: 'A nurse practitioner who performs such services as such individual is legally authorized to perform (in the State in which the individual performs such services) in accordance with State law, and who meets such training, education, and experience requirements as the Secretary may prescribe in regulations',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Legally authorized by state', 'Meets training/education requirements', 'Not a bona fide employee of reporting entity'],
        examples: ['NP', 'Nurse Practitioner'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_clinical_nurse_specialist',
        term: 'Clinical Nurse Specialist',
        definition: 'An individual who is a registered nurse and is licensed to practice nursing in the State in which the clinical nurse specialist services are performed, and holds a master\'s degree in a defined clinical area of nursing from an accredited educational institution',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Registered nurse', 'Licensed in state', 'Master\'s degree in clinical nursing', 'Not a bona fide employee of reporting entity'],
        examples: ['CNS', 'Clinical Nurse Specialist'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_certified_registered_nurse_anesthetist',
        term: 'Certified Registered Nurse Anesthetist',
        definition: 'A certified registered nurse anesthetist licensed by the State who meets such education, training, and other requirements relating to anesthesia services and related care as the Secretary may prescribe. Such term also includes, as prescribed by the Secretary, an anesthesiologist assistant',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Licensed by state', 'Meets education/training requirements', 'Not a bona fide employee of reporting entity'],
        examples: ['CRNA', 'Certified Registered Nurse Anesthetist', 'Anesthesiologist Assistant'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_certified_nurse_midwife',
        term: 'Certified Nurse Midwife',
        definition: 'A registered nurse who has successfully completed a program of study and clinical experience meeting guidelines prescribed by the Secretary, or has been certified by an organization recognized by the Secretary',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Registered nurse', 'Completed program of study', 'Clinical experience', 'Not a bona fide employee of reporting entity'],
        examples: ['CNM', 'Certified Nurse Midwife'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient_teaching_hospital',
        term: 'Teaching Hospital',
        definition: 'For the purposes of Open Payments, "teaching hospitals" are hospitals that received payment for Medicare direct graduate medical education (GME), inpatient prospective payment system (IPPS) indirect medical education (IME), or psychiatric hospital IME programs during the last calendar year for which such information is available',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Received Medicare GME payment', 'Received IPPS IME payment', 'Received psychiatric hospital IME payment'],
        examples: ['Academic medical centers', 'University hospitals', 'Teaching institutions'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'recipient_teaching_hospital',
        term: 'Teaching Hospital',
        definition: 'Hospital that provides medical education and training programs',
        category: 'recipient_type',
        reportability: 'reportable',
        conditions: ['Hospital with medical education programs', 'Residency or fellowship programs'],
        examples: ['Academic medical centers', 'University hospitals', 'Teaching institutions'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'recipient_non_physician',
        term: 'Non-Physician Healthcare Professional',
        definition: 'Healthcare professional who cannot prescribe medications',
        category: 'recipient_type',
        reportability: 'non_reportable',
        conditions: ['Cannot prescribe medications', 'Not a physician'],
        examples: ['Nurse', 'Pharmacist', 'Physical therapist', 'Medical assistant'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },

      // Product Types
      {
        id: 'product_drug',
        term: 'Covered Drug',
        definition: 'Prescription drug that is covered by Medicare, Medicaid, or CHIP',
        category: 'product_type',
        reportability: 'reportable',
        conditions: ['Prescription drug', 'Covered by government programs'],
        examples: ['Prescription medications', 'Brand name drugs', 'Generic drugs'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'product_device',
        term: 'Covered Device',
        definition: 'Medical device that is covered by Medicare, Medicaid, or CHIP',
        category: 'product_type',
        reportability: 'reportable',
        conditions: ['Medical device', 'Covered by government programs'],
        examples: ['Surgical instruments', 'Diagnostic equipment', 'Therapeutic devices'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'product_biological',
        term: 'Covered Biological',
        definition: 'Biological product that is covered by Medicare, Medicaid, or CHIP',
        category: 'product_type',
        reportability: 'reportable',
        conditions: ['Biological product', 'Covered by government programs'],
        examples: ['Vaccines', 'Blood products', 'Gene therapies'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },

      // Key Regulatory Definitions
      {
        id: 'applicable_manufacturer',
        term: 'Applicable Manufacturer',
        definition: 'Entities that operate in the United States and (1) are engaged in the production, preparation, propagation, compounding, or conversion of a covered drug, device, biological, or medical supply, but not if such covered drug, device, biological or medical supply is solely for use by or within the entity itself or by the entity\'s own patients (this definition does not include distributors or wholesalers that do not hold title to any covered drug, device, biological or medical supply); or (2) are entities under common ownership with an entity described in part (1) of this definition, which provides assistance or support to such entities',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Operates in United States', 'Produces covered products', 'Not solely for own use'],
        examples: ['Pharmaceutical companies', 'Medical device manufacturers', 'Biotechnology companies'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'applicable_gpo',
        term: 'Applicable Group Purchasing Organization (GPO)',
        definition: 'Entities that operate in the United States and purchase, arrange for or negotiate the purchase of covered drugs, devices, biologicals, or medical supplies for a group of individuals or entities, but not solely for use by the entity itself',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Operates in United States', 'Purchases for group', 'Not solely for own use'],
        examples: ['Group purchasing organizations', 'Healthcare purchasing cooperatives'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'covered_recipient',
        term: 'Covered Recipient',
        definition: 'Any physician, physician assistant, nurse practitioner, clinical nurse specialist, certified registered nurse anesthetist, or certified nurse-midwife who is not a bona fide employee of the applicable manufacturer that is reporting the payment; or a teaching hospital',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Qualified healthcare professional', 'Not a bona fide employee of reporting entity', 'Or teaching hospital'],
        examples: ['Physicians', 'Nurse practitioners', 'Teaching hospitals'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'research',
        term: 'Research',
        definition: 'Research is a systematic investigation to develop or contribute to generalized knowledge about public health, including behavioral and social-sciences research. This definition includes basic and applied research, and product development',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Systematic investigation', 'Develops generalized knowledge', 'Public health related'],
        examples: ['Clinical trials', 'Basic research', 'Product development studies'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'transfers_of_value',
        term: 'Transfers of Value',
        definition: 'Payments or other transfers of value are anything of value given by an applicable manufacturer or applicable GPO to a covered recipient or physician owner/investor that does not fall within one of the excluded categories in the rule',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Anything of value', 'Given by applicable manufacturer/GPO', 'To covered recipient', 'Not in excluded categories'],
        examples: ['Cash payments', 'Gifts', 'Services', 'Travel'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'ownership_investment_interest',
        term: 'Ownership or Investment Interest',
        definition: 'Ownership and investment interest includes, but is not limited to: Stock, Stock option(s) (other than those received as compensation, until they are exercised), Partnership share(s), Limited liability company membership(s), Loans, Bonds or Other financial instruments that are secured with an entity\'s property or revenue or a portion of that property or revenue. This may be direct or indirect and through debt, equity or other means',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Any amount', 'Direct or indirect ownership', 'Through debt, equity or other means'],
        examples: ['Stock ownership', 'Stock options', 'Partnership shares', 'LLC membership', 'Loans', 'Bonds'],
        regulatoryBasis: '42 CFR 403.902',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'npi',
        term: 'National Provider Identifier (NPI)',
        definition: 'An NPI, or National Provider Identifier, is a unique, random number assigned to each covered health care provider. It is used to identify the provider in administrative and financial transactions according to Health Insurance Portability and Accountability Act (HIPAA) standards',
        category: 'regulatory_term',
        reportability: 'conditional',
        conditions: ['Unique identifier', 'HIPAA standard', 'Administrative and financial transactions'],
        examples: ['10-digit NPI number', 'Provider identification'],
        regulatoryBasis: 'HIPAA Standards',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },

      // Compliance Terms
      {
        id: 'compliance_reportable',
        term: 'Reportable Payment',
        definition: 'Payment that must be reported to CMS under the Open Payments program',
        category: 'compliance_term',
        reportability: 'reportable',
        conditions: ['Meets reporting requirements', 'Above threshold amounts'],
        examples: ['Payments > $10', 'Research payments', 'Consulting fees'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compliance_non_reportable',
        term: 'Non-Reportable Payment',
        definition: 'Payment that is exempt from CMS reporting requirements',
        category: 'compliance_term',
        reportability: 'non_reportable',
        conditions: ['Below threshold amounts', 'Exempt categories'],
        examples: ['Payments < $10', 'Educational materials', 'Patient care items'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'compliance_threshold',
        term: 'Reporting Threshold',
        definition: 'Minimum amount that triggers reporting requirements',
        category: 'compliance_term',
        reportability: 'conditional',
        conditions: ['Amount > $10', 'Annual aggregate > $100'],
        examples: ['$10 per payment', '$100 annual aggregate'],
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'international_recipient_reporting',
        term: 'International Recipient Reporting',
        definition: 'Payments to covered recipients located outside the United States remain reportable when made by an applicable manufacturer or applicable GPO operating in the United States. A non-U.S. recipient address does not exempt the payment from CMS Open Payments reporting if the recipient meets covered recipient criteria and thresholds are met.',
        category: 'compliance_term',
        reportability: 'reportable',
        conditions: ['Covered recipient', 'Amount > $10 aggregate threshold', 'Applicable manufacturer/GPO operating in U.S.'],
        examples: ['Consulting fee to U.S.-licensed physician practicing abroad', 'Grant to foreign teaching hospital on CMS list'],
        regulatoryBasis: '42 CFR 403.904; CMS Open Payments Program Guidance',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'country_of_travel',
        term: 'Country of Travel',
        definition: 'For travel and lodging payments, CMS requires reporting of the city, state/province, and country where travel occurred. Travel outside the United States is reportable—not exempt—when all other reporting criteria are met.',
        category: 'compliance_term',
        reportability: 'reportable',
        conditions: ['Nature of payment includes travel/lodging', 'Amount > $10', 'Travel destination captured in submission file'],
        examples: ['International conference airfare', 'Hotel at medical congress outside U.S.'],
        regulatoryBasis: 'CMS Open Payments data dictionary — Country_of_Travel field',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'recipient_country_field',
        term: 'Recipient Country',
        definition: 'The country where the covered recipient\'s primary business address is located. Used for domestic vs. international address validation. Non-U.S. values require Recipient Province and Recipient Postal Code instead of U.S. state/ZIP alone.',
        category: 'compliance_term',
        reportability: 'conditional',
        conditions: ['Required for international addresses', 'Impacts address validation—not reportability exemption'],
        examples: ['Recipient_Country = Canada', 'Recipient_Country = United Kingdom'],
        regulatoryBasis: 'CMS Open Payments data dictionary — Recipient_Country field',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      },
      {
        id: 'us_territory_recipient',
        term: 'U.S. Territory Recipient',
        definition: 'Recipients in U.S. territories (Puerto Rico, Guam, U.S. Virgin Islands, American Samoa, Northern Mariana Islands) follow U.S. state/territory coding and remain fully reportable under Open Payments.',
        category: 'regulatory_term',
        reportability: 'reportable',
        conditions: ['Valid territory state code (PR, GU, VI, AS, MP)', 'Standard reporting thresholds apply'],
        examples: ['Physician in Puerto Rico (PR)', 'Hospital in Guam (GU)'],
        regulatoryBasis: 'CMS Open Payments — U.S. state/territory codes',
        lastUpdated: new Date().toISOString(),
        version: '1.0'
      }
    ]
  }

  /**
   * Initialize official CMS Open Payments reportability rules based on 21 CFR
   */
  private initializeDefaultRules(): void {
    this.reportabilityRules = [
      // Official CMS Amount Threshold Rules
      {
        id: 'rule_amount_threshold_10',
        name: 'Minimum Amount Threshold - $10',
        description: 'Payments below $10 are not reportable under CMS Open Payments program',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'amount',
            operator: 'less_than',
            value: 10
          }
        ],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(c)(1)',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_annual_aggregate_threshold_100',
        name: 'Annual Aggregate Threshold - $100',
        description: 'Annual aggregate payments below $100 are not reportable under CMS Open Payments program',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'annualAggregate',
            operator: 'less_than',
            value: 100
          }
        ],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(c)(1)',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_annual_aggregate',
        name: 'Annual Aggregate Threshold',
        description: 'Annual aggregate payments below $100 are not reportable',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'annualAggregate',
            operator: 'less_than',
            value: 100
          }
        ],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Payment Type Rules
      {
        id: 'rule_research_payment',
        name: 'Research Payment Reportability',
        description: 'Research payments are reportable if above threshold',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'research'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_consulting_payment',
        name: 'Consulting Payment Reportability',
        description: 'Consulting payments are reportable if above threshold',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'consulting'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Recipient Type Rules
      {
        id: 'rule_physician_recipient',
        name: 'Physician Recipient Reportability',
        description: 'Payments to physicians are reportable if above threshold',
        category: 'recipient_type',
        conditions: [
          {
            field: 'recipientType',
            operator: 'equals',
            value: 'physician'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_teaching_hospital_recipient',
        name: 'Teaching Hospital Recipient Reportability',
        description: 'Payments to teaching hospitals are reportable if above threshold',
        category: 'recipient_type',
        conditions: [
          {
            field: 'recipientType',
            operator: 'equals',
            value: 'teaching_hospital'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Product Type Rules
      {
        id: 'rule_covered_drug',
        name: 'Covered Drug Reportability',
        description: 'Payments related to covered drugs are reportable',
        category: 'product_type',
        conditions: [
          {
            field: 'productType',
            operator: 'equals',
            value: 'covered_drug'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_covered_device',
        name: 'Covered Device Reportability',
        description: 'Payments related to covered devices are reportable',
        category: 'product_type',
        conditions: [
          {
            field: 'productType',
            operator: 'equals',
            value: 'covered_device'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Exemptions (COM-TRANSP-001 — evaluated in transparency-rules-engine.ts)
      {
        id: 'rule_discount_rebate_exempt',
        name: 'Discount/Rebate Exemption',
        description: 'Discounts and rebates on covered products are not reportable',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'rebate' }],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — excluded transfers',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_sample_patient_use_exempt',
        name: 'Product Sample Exemption',
        description: 'Product samples intended for patient use are not reportable',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'sample' }],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — product samples for patients',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_patient_education_exempt',
        name: 'Patient Education Materials Exemption',
        description: 'Educational materials directly for patient use are not reportable (not CME/speaker fees)',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'patient education' }],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — patient-use materials',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_support_act_covered_recipient',
        name: 'SUPPORT Act Covered Recipient',
        description: 'Physicians, PAs, NPs, CNSs, CRNAs, CNMs, and teaching hospitals are covered recipients',
        category: 'recipient_type',
        conditions: [{ field: 'recipientType', operator: 'contains', value: 'physician' }],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2019-01-01',
        regulatoryBasis: 'SUPPORT Act; 42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_ownership_investment_reportable',
        name: 'Ownership/Investment Interest',
        description: 'Ownership or investment interests are reportable at any amount under separate CMS category',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'ownership' }],
        result: 'reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — Ownership/Investment Interest',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_indirect_payment_reportable',
        name: 'Indirect Third-Party Payment',
        description: 'Payments to third parties intended for a covered recipient are reportable',
        category: 'payment_type',
        conditions: [{ field: 'thirdPartyIndicator', operator: 'equals', value: 'yes' }],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — indirect payments',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_third_party_name_required',
        name: 'Third-Party Entity Name Required',
        description: 'Third-party entity name must be populated for indirect payments',
        category: 'payment_type',
        conditions: [],
        result: 'conditional',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments data dictionary',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_efpia_consent_individual',
        name: 'EFPIA Individual Disclosure (Consent Given)',
        description: 'Named HCP disclosure when consent is granted',
        category: 'regulatory_term',
        conditions: [],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code; GDPR',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_efpia_no_consent_aggregate',
        name: 'EFPIA Aggregate Disclosure (No Consent)',
        description: 'Aggregate disclosure when HCP consent is not granted',
        category: 'regulatory_term',
        conditions: [],
        result: 'conditional',
        priority: 5,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_rd_aggregate_only',
        name: 'R&D Aggregate Disclosure',
        description: 'Research payments disclosed on aggregate basis regardless of consent',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'research' }],
        result: 'conditional',
        priority: 4,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code; CMS Research Payment category',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_patient_care_items',
        name: 'Patient Care Items Exemption',
        description: 'Items for patient care are generally not reportable',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'patient care'
          }
        ],
        result: 'non_reportable',
        priority: 7,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Geographic & International Reporting Rules
      {
        id: 'rule_foreign_recipient_reportable',
        name: 'Foreign Recipient — Still Reportable',
        description: 'Payments to covered recipients outside the United States remain reportable when thresholds are met. Non-U.S. location is not an exemption.',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'not_equals', value: 'United States' },
          { field: 'amount', operator: 'greater_than', value: 10, logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904; CMS Open Payments international guidance',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_travel_outside_us_reportable',
        name: 'Travel Outside U.S. — Reportable',
        description: 'Travel and lodging payments where Country of Travel is outside the United States are reportable when amount exceeds threshold.',
        category: 'geographic',
        conditions: [
          { field: 'countryOfTravel', operator: 'not_equals', value: 'United States' },
          { field: 'natureOfPayment', operator: 'contains', value: 'travel', logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Country_of_Travel, State_of_Travel, City_of_Travel fields',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_international_conference_travel',
        name: 'International Conference Travel',
        description: 'Educational or speaking travel to international locations is reportable; capture travel city, state/province, and country in the submission.',
        category: 'geographic',
        conditions: [
          { field: 'natureOfPayment', operator: 'contains', value: 'travel' },
          { field: 'countryOfTravel', operator: 'not_equals', value: 'United States', logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(e)(2) — Travel and Lodging',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_foreign_recipient_enhanced_review',
        name: 'Foreign Recipient — Enhanced Review',
        description: 'International recipient payments require enhanced manual review for address completeness (country, province, postal code) and covered recipient eligibility.',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'not_equals', value: 'United States' }
        ],
        result: 'conditional',
        priority: 5,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments data validation — international addresses',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_us_state_required_domestic',
        name: 'U.S. Recipient — State Required',
        description: 'For U.S. recipients, a valid 2-letter state or territory code is required for data quality (does not affect reportability if payment is otherwise reportable).',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'equals', value: 'United States' },
          { field: 'recipientState', operator: 'equals', value: '', logicalOperator: 'AND' }
        ],
        result: 'conditional',
        priority: 6,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Recipient_State validation',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_us_territory_recipient',
        name: 'U.S. Territory Recipient',
        description: 'Recipients in U.S. territories use territory codes (PR, GU, VI, AS, MP) and follow standard reportability rules.',
        category: 'geographic',
        conditions: [
          { field: 'recipientState', operator: 'in', value: ['PR', 'GU', 'VI', 'AS', 'MP'] }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments state/territory codes',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_manufacturer_foreign_country_info',
        name: 'Manufacturer Foreign Location — Informational',
        description: 'Applicable manufacturer country of location is reported but does not exempt U.S. operating entities from Open Payments reporting obligations.',
        category: 'geographic',
        conditions: [
          { field: 'manufacturerCountry', operator: 'not_equals', value: 'United States' }
        ],
        result: 'conditional',
        priority: 8,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Country',
        lastUpdated: new Date().toISOString()
      }
    ]
  }

  /**
   * Analyze payment record for reportability (COM-TRANSP-001 transparency engine).
   */
  async analyzeReportability(record: CMSRecord): Promise<ReportabilityAnalysis> {
    const { runTransparencyAnalysis } = await import('@/lib/transparency-rules-engine')
    return runTransparencyAnalysis(record)
  }

  /** @deprecated Logic moved to transparency-rules-engine.ts — kept for reference */
  private async _legacyAnalyzeReportability(record: CMSRecord): Promise<ReportabilityAnalysis> {
    const applicableRules: string[] = []
    const reasoning: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    const glossaryMatches: { term: string; definition: string; reportability: string }[] = []

    const amount = record.totalAmountOfPaymentUsdollars ?? 0
    const natureOfPayment = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
    const location = describeRecipientLocation(record)

    let isReportable = false
    let confidence = 0.5

    // Amount threshold
    const amountThresholdRule = this.reportabilityRules.find((r) => r.id === 'rule_amount_threshold_10')
    if (amount < 10) {
      if (amountThresholdRule) applicableRules.push(amountThresholdRule.id)
      reasoning.push(`Payment amount ($${amount.toFixed(2)}) is below the $10 CMS reporting threshold`)
      return {
        isReportable: false,
        confidence: 0.95,
        applicableRules,
        reasoning,
        warnings,
        recommendations,
        glossaryMatches,
      }
    }

    reasoning.push(`Payment amount ($${amount.toFixed(2)}) meets the $10 minimum threshold`)

    // Geographic / international rules
    if (location.isForeignRecipient) {
      applicableRules.push('rule_foreign_recipient_reportable')
      reasoning.push(
        `Recipient located outside the U.S. (${record.recipientCountry}) — payment remains reportable under CMS Open Payments`
      )
      isReportable = true
      confidence = 0.85
      applicableRules.push('rule_foreign_recipient_enhanced_review')
      warnings.push('International recipient — verify province/postal code and covered recipient eligibility')
      recommendations.push('Confirm physician is U.S.-licensed covered recipient or teaching hospital is on CMS list')
    }

    if (location.isTravelOutsideUs) {
      applicableRules.push('rule_travel_outside_us_reportable', 'rule_international_conference_travel')
      reasoning.push(
        `Travel outside U.S. (${record.countryOfTravel}) is reportable — capture city, state/province, and country`
      )
      isReportable = true
      confidence = Math.max(confidence, 0.88)
    }

    if (isUnitedStatesCountry(record.recipientCountry) && record.recipientState && !isValidUsStateOrTerritory(record.recipientState)) {
      warnings.push(`Recipient state "${record.recipientState}" may not be a valid U.S. state/territory code`)
      recommendations.push('Correct Recipient_State or use Recipient_Country + Province for international addresses')
    }

    if (isUnitedStatesCountry(record.recipientCountry) && !record.recipientState?.trim()) {
      applicableRules.push('rule_us_state_required_domestic')
      warnings.push('U.S. recipient missing state code — data quality issue')
    }

    if (record.recipientState && ['PR', 'GU', 'VI', 'AS', 'MP'].includes(record.recipientState.toUpperCase())) {
      applicableRules.push('rule_us_territory_recipient')
      reasoning.push(`U.S. territory recipient (${record.recipientState}) — standard reportability applies`)
      isReportable = true
    }

    if (isOutsideUnitedStates(record.applicableManufacturerOrApplicableGpoMakingPaymentCountry)) {
      applicableRules.push('rule_manufacturer_foreign_country_info')
      reasoning.push('Manufacturer located outside U.S. — location is informational; U.S. reporting entity must still report')
    }

    // Payment type rules
    const paymentType = this.determinePaymentType(record)
    const paymentTypeRule = this.reportabilityRules.find(
      (rule) =>
        rule.category === 'payment_type' &&
        rule.result === 'reportable' &&
        rule.conditions.some(
          (condition) =>
            condition.field === 'natureOfPayment' &&
            natureOfPayment.includes(String(condition.value).toLowerCase())
        )
    )
    if (paymentTypeRule) {
      applicableRules.push(paymentTypeRule.id)
      reasoning.push(`Payment type "${paymentType}" matches: ${paymentTypeRule.description}`)
      isReportable = true
      confidence = Math.max(confidence, 0.82)
    }

    // Exemptions
    const exemptionRule = this.reportabilityRules.find(
      (rule) =>
        rule.result === 'non_reportable' &&
        rule.conditions.every((condition) => {
          if (condition.field === 'natureOfPayment') {
            return natureOfPayment.includes(String(condition.value).toLowerCase())
          }
          if (condition.field === 'amount') {
            return amount < Number(condition.value)
          }
          return false
        })
    )
    if (exemptionRule) {
      applicableRules.push(exemptionRule.id)
      reasoning.push(`Exemption applied: ${exemptionRule.description}`)
      isReportable = false
      confidence = 0.85
    }

    // Default: above threshold with no exemption
    if (!exemptionRule && amount >= 10 && !isReportable) {
      isReportable = true
      confidence = 0.75
      reasoning.push('Payment exceeds $10 threshold with no applicable exemption')
    }

    // Glossary matches
    const searchText = [
      natureOfPayment,
      record.coveredRecipientName,
      record.coveredRecipientType,
      record.recipientCountry,
      record.countryOfTravel,
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

    this.glossaryTerms
      .filter(
        (term) =>
          relevantTermIds.has(term.id) ||
          searchText.includes(term.term.toLowerCase())
      )
      .slice(0, 6)
      .forEach((term) => {
        glossaryMatches.push({
          term: term.term,
          definition: term.definition,
          reportability: term.reportability,
        })
      })

    if (amount >= 10 && amount < 100) {
      warnings.push('Payment is above per-payment threshold but may fall below annual $100 aggregate')
      recommendations.push('Track toward annual aggregate reporting threshold per recipient')
    }

    if (isReportable && location.isForeignRecipient) {
      recommendations.push('Include Recipient_Country, Recipient_Province, and Recipient_Postal_Code in CMS submission')
    }

    const jurisdictionAnalysis = internationalComplianceService.analyzeMultiJurisdiction(record)
    jurisdictionAnalysis.applicableJurisdictions.forEach((j) => {
      applicableRules.push(...j.applicableRuleIds)
      if (j.countryCode !== 'US' && j.isReportable) {
        reasoning.push(`${j.countryName}: ${j.sunshineActEquivalent} — ${j.reportability}`)
      }
    })
    warnings.push(...jurisdictionAnalysis.allWarnings)
    recommendations.push(...jurisdictionAnalysis.allRecommendations)

    return {
      isReportable,
      confidence,
      applicableRules: [...new Set(applicableRules)],
      reasoning,
      warnings: [...new Set(warnings)],
      recommendations: [...new Set(recommendations)],
      glossaryMatches,
      jurisdictionAnalysis,
    }
  }

  /**
   * Determine payment type from record description
   */
  private determinePaymentType(record: CMSRecord): string {
    const description = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
    
    if (description.includes('research') || description.includes('study') || description.includes('trial')) {
      return 'research'
    }
    if (description.includes('consulting') || description.includes('advisory')) {
      return 'consulting'
    }
    if (description.includes('speaking') || description.includes('lecture') || description.includes('presentation')) {
      return 'speaking'
    }
    if (description.includes('travel') || description.includes('lodging') || description.includes('transportation')) {
      return 'travel'
    }
    if (description.includes('food') || description.includes('meal') || description.includes('beverage')) {
      return 'food'
    }
    if (description.includes('gift') || description.includes('item')) {
      return 'gift'
    }
    if (description.includes('education') || description.includes('training') || description.includes('cme')) {
      return 'education'
    }
    if (description.includes('royalty') || description.includes('license')) {
      return 'royalty'
    }
    if (description.includes('ownership') || description.includes('investment') || description.includes('equity')) {
      return 'ownership'
    }
    
    return 'other'
  }

  /**
   * Determine recipient type from record
   */
  private determineRecipientType(record: CMSRecord): string {
    const providerName = (record.coveredRecipientName || record.teachingHospitalName || '').toLowerCase()
    const recipientType = (record.coveredRecipientType || '').toLowerCase()
    
    if (providerName.includes('hospital') || providerName.includes('medical center') || recipientType.includes('teaching hospital')) {
      return 'teaching_hospital'
    }
    
    // Check if it's a physician (simplified check)
    if (providerName.includes('dr.') || providerName.includes('doctor') || providerName.includes('md') || providerName.includes('do')) {
      return 'physician'
    }
    
    return 'physician' // Default assumption for CMS records
  }

  /**
   * Get all glossary terms
   */
  async getGlossaryTerms(category?: string): Promise<GlossaryTerm[]> {
    if (category) {
      return this.glossaryTerms.filter(term => term.category === category)
    }
    return this.glossaryTerms
  }

  /**
   * Get all reportability rules
   */
  async getReportabilityRules(category?: string): Promise<ReportabilityRule[]> {
    if (category) {
      return this.reportabilityRules.filter(rule => rule.category === category)
    }
    return this.reportabilityRules
  }

  /**
   * Search glossary terms
   */
  async searchGlossaryTerms(query: string): Promise<GlossaryTerm[]> {
    const searchQuery = query.toLowerCase()
    return this.glossaryTerms.filter(term => 
      term.term.toLowerCase().includes(searchQuery) ||
      term.definition.toLowerCase().includes(searchQuery) ||
      term.examples?.some(example => example.toLowerCase().includes(searchQuery))
    )
  }

  /**
   * Add new glossary term
   */
  async addGlossaryTerm(term: Omit<GlossaryTerm, 'id' | 'lastUpdated' | 'version'>): Promise<GlossaryTerm> {
    const newTerm: GlossaryTerm = {
      ...term,
      id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
    
    this.glossaryTerms.push(newTerm)
    return newTerm
  }

  /**
   * Add new reportability rule
   */
  async addReportabilityRule(rule: Omit<ReportabilityRule, 'id' | 'lastUpdated'>): Promise<ReportabilityRule> {
    const newRule: ReportabilityRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString()
    }
    
    this.reportabilityRules.push(newRule)
    return newRule
  }

  /**
   * Update glossary term
   */
  async updateGlossaryTerm(id: string, updates: Partial<GlossaryTerm>): Promise<GlossaryTerm | null> {
    const index = this.glossaryTerms.findIndex(term => term.id === id)
    if (index === -1) return null
    
    this.glossaryTerms[index] = {
      ...this.glossaryTerms[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    }
    
    return this.glossaryTerms[index]
  }

  /**
   * Update reportability rule
   */
  async updateReportabilityRule(id: string, updates: Partial<ReportabilityRule>): Promise<ReportabilityRule | null> {
    const index = this.reportabilityRules.findIndex(rule => rule.id === id)
    if (index === -1) return null
    
    this.reportabilityRules[index] = {
      ...this.reportabilityRules[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    }
    
    return this.reportabilityRules[index]
  }

  /**
   * Delete glossary term
   */
  async deleteGlossaryTerm(id: string): Promise<boolean> {
    const index = this.glossaryTerms.findIndex(term => term.id === id)
    if (index === -1) return false
    
    this.glossaryTerms.splice(index, 1)
    return true
  }

  /**
   * Delete reportability rule
   */
  async deleteReportabilityRule(id: string): Promise<boolean> {
    const index = this.reportabilityRules.findIndex(rule => rule.id === id)
    if (index === -1) return false
    
    this.reportabilityRules.splice(index, 1)
    return true
  }

  /**
   * Get reportability statistics
   */
  async getReportabilityStats(): Promise<{
    totalTerms: number
    totalRules: number
    reportableTerms: number
    nonReportableTerms: number
    conditionalTerms: number
    exemptTerms: number
    ruleCategories: Record<string, number>
  }> {
    const reportableTerms = this.glossaryTerms.filter(term => term.reportability === 'reportable').length
    const nonReportableTerms = this.glossaryTerms.filter(term => term.reportability === 'non_reportable').length
    const conditionalTerms = this.glossaryTerms.filter(term => term.reportability === 'conditional').length
    const exemptTerms = this.glossaryTerms.filter(term => term.reportability === 'exempt').length

    const ruleCategories = this.reportabilityRules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTerms: this.glossaryTerms.length,
      totalRules: this.reportabilityRules.length,
      reportableTerms,
      nonReportableTerms,
      conditionalTerms,
      exemptTerms,
      ruleCategories
    }
  }
}

// Export singleton instance
export const glossaryService = new GlossaryService()
