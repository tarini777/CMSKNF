/**
 * Official CMS Open Payments glossary entries (A–T).
 * Source: https://openpaymentsdata.cms.gov/about
 * Nature of payment categories: 42 CFR 403.904(e)(2)
 * General definitions: 42 CFR 403.902
 */

export type CmsGlossaryCategory = 'Nature of Payment' | 'Type of Payment' | 'General definitions'

export interface CmsOpenPaymentsGlossaryEntry {
  id: string
  letter: string
  term: string
  definition: string
  cmsCategory: CmsGlossaryCategory
  programYearNote?: string
  regulatoryBasis?: string
  conditions?: string[]
  examples?: string[]
}

export const CMS_OPEN_PAYMENTS_GLOSSARY: CmsOpenPaymentsGlossaryEntry[] = [
  {
    id: 'cms_acquisitions',
    letter: 'A',
    term: 'Acquisitions',
    cmsCategory: 'Nature of Payment',
    definition:
      'Buyout payments made to covered recipients who have ownership interest in a company that has been acquired.',
    programYearNote: 'Available beginning with Program Year 2021. Previous program years do not include this category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_applicable_gpo',
    letter: 'A',
    term: 'Applicable Group Purchasing Organization (GPO)',
    cmsCategory: 'General definitions',
    definition:
      'Applicable group purchasing organizations (GPOs) are entities that operate in the United States and purchase, arrange for or negotiate the purchase of covered drugs, devices, biologicals, or medical supplies for a group of individuals or entities, but not solely for use by the entity itself.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_applicable_manufacturer',
    letter: 'A',
    term: 'Applicable Manufacturers',
    cmsCategory: 'General definitions',
    definition:
      'Applicable manufacturers are entities that operate in the United States and (1) are engaged in the production, preparation, propagation, compounding, or conversion of a covered drug, device, biological, or medical supply, but not if such covered drug, device, biological or medical supply is solely for use by or within the entity itself or by the entity\'s own patients (this definition does not include distributors or wholesalers (including, but not limited to, repackagers, relabelers, and kit assemblers) that do not hold title to any covered drug, device, biological or medical supply); or (2) are entities under common ownership with an entity described in part (1) of this definition, which provides assistance or support to such entities with respect to the production, preparation, propagation, compounding, conversion, marketing, promotion, sale, or distribution of a covered drug, device, biological or medical supply.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_associated_research',
    letter: 'A',
    term: 'Associated Research',
    cmsCategory: 'Type of Payment',
    definition:
      'Funding for a research project or study where the covered recipient is named as a principal investigator. This type of funding does not necessarily indicate that the covered recipient received direct funds from the reporting entity. The principal investigator may have varying degrees of involvement with the research project / study.',
    conditions: ['Named principal investigator', 'Research project or study funding'],
  },
  {
    id: 'cms_certified_nurse_midwife',
    letter: 'C',
    term: 'Certified Nurse Midwife',
    cmsCategory: 'General definitions',
    definition:
      'A registered nurse who has successfully completed a program of study and clinical experience meeting guidelines prescribed by the Secretary, or has been certified by an organization recognized by the Secretary.',
    programYearNote: 'Included as a covered recipient type beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_certified_registered_nurse_anesthetist',
    letter: 'C',
    term: 'Certified Registered Nurse Anesthetist',
    cmsCategory: 'General definitions',
    definition:
      'A certified registered nurse anesthetist licensed by the State who meets such education, training, and other requirements relating to anesthesia services and related care as the Secretary may prescribe. In prescribing such requirements the Secretary may use the same requirements as those established by a national organization for the certification of nurse anesthetists. Such term also includes, as prescribed by the Secretary, an anesthesiologist assistant.',
    programYearNote: 'Included as a covered recipient type beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_charitable_contribution',
    letter: 'C',
    term: 'Charitable Contribution',
    cmsCategory: 'Nature of Payment',
    definition:
      'A payment or transfer of value made to an organization with tax-exempt status under the Internal Revenue Code of 1986. Charitable contributions do not include payments or transfers of value that would be more specifically described by one of the other payment categories.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_clinical_nurse_specialist',
    letter: 'C',
    term: 'Clinical Nurse Specialist',
    cmsCategory: 'General definitions',
    definition:
      'An individual who: (1) is a registered nurse and is licensed to practice nursing in the State in which the clinical nurse specialist services are performed; and (2) holds a master\'s degree in a defined clinical area of nursing from an accredited educational institution.',
    programYearNote: 'Included as a covered recipient type beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_compensation_accredited_ce',
    letter: 'C',
    term: 'Compensation for serving as faculty or as a speaker for an accredited or certified continuing education program',
    cmsCategory: 'Nature of Payment',
    definition:
      'Compensation for serving as faculty or as a speaker for an accredited or certified continuing education program.',
    programYearNote: 'Applicable to Program Years 2013–2020. Combined into medical education program category from Program Year 2021.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_compensation_services_other',
    letter: 'C',
    term: 'Compensation for services other than consulting, including serving as faculty or as a speaker at an event other than a continuing education program',
    cmsCategory: 'Nature of Payment',
    definition:
      'Payments for services other than consulting, including serving as faculty or as a speaker at an event other than a continuing education program.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_compensation_non_accredited_ce',
    letter: 'C',
    term: 'Compensation for serving as faculty or as a speaker for a non-accredited and noncertified continuing education program',
    cmsCategory: 'Nature of Payment',
    definition:
      'Compensation for serving as faculty or as a speaker for a non-accredited and non-certified continuing education program.',
    programYearNote: 'Applicable to Program Years 2013–2020. Beginning with Program Year 2021, combined under medical education program category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_compensation_medical_education',
    letter: 'C',
    term: 'Compensation for serving as faculty or as a speaker for a medical education program',
    cmsCategory: 'Nature of Payment',
    definition:
      'Beginning with Program Year 2021 the accredited/certified and unaccredited/non-certified continuing education program categories are combined into one, “Compensation for serving as faculty or as a speaker for a medical education program.”',
    programYearNote: 'Program Year 2021 and subsequent. Replaces separate accredited/non-accredited CE categories.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_consulting_fee',
    letter: 'C',
    term: 'Consulting Fee',
    cmsCategory: 'Nature of Payment',
    definition:
      'A payment that a company makes to a physician for advice and expertise about a medical product or treatment. Consulting fees are typically arranged with a written agreement between a company and physician based on the company\'s particular business needs. These payments often vary depending on the consulting physician\'s expertise.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_covered_recipient',
    letter: 'C',
    term: 'Covered Recipient',
    cmsCategory: 'General definitions',
    definition:
      'Any physician, physician assistant, nurse practitioner, clinical nurse specialist, certified registered nurse anesthetist, or certified nurse-midwife who is not a bona fide employee of the applicable manufacturer that is reporting the payment; or a teaching hospital, which is any institution that received a payment under 1886(d)(5)(B), 1886(h), or 1886(s) of the Act during the last calendar year for which such information is available.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_current_prospective_ownership',
    letter: 'C',
    term: 'Current or prospective ownership or investment interest',
    cmsCategory: 'Nature of Payment',
    definition:
      'Ownership or investment interest currently held by physicians and teaching hospitals, as well as ownership or investment interest that could potentially be held by physicians and teaching hospitals.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_debt_forgiveness',
    letter: 'D',
    term: 'Debt Forgiveness',
    cmsCategory: 'Nature of Payment',
    definition:
      'Forgiving the debt of a covered recipient, a physician owner, or the immediate family of the physician.',
    programYearNote: 'Added beginning with Program Year 2021. Previous program years do not include this category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_education',
    letter: 'E',
    term: 'Education',
    cmsCategory: 'Nature of Payment',
    definition:
      'Payments or transfers of value for classes, activities, programs, or events that involve learning or teaching a profession skill. This payment can include things like textbooks and medical journal articles.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_entertainment',
    letter: 'E',
    term: 'Entertainment',
    cmsCategory: 'Nature of Payment',
    definition:
      'Attendance at recreational, cultural, sporting or other events that would generally have a cost.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_food_beverage',
    letter: 'F',
    term: 'Food and Beverage',
    cmsCategory: 'Nature of Payment',
    definition: 'Food and beverage.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_general_payment',
    letter: 'G',
    term: 'General Payment',
    cmsCategory: 'Type of Payment',
    definition: 'Payments that are not associated with a research study.',
    conditions: ['Not linked to a research study record'],
  },
  {
    id: 'cms_gift',
    letter: 'G',
    term: 'Gift',
    cmsCategory: 'Nature of Payment',
    definition:
      'A general category which includes anything a reporting entity provides to a covered recipient that does not fit into another Nature of Payment category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_grant',
    letter: 'G',
    term: 'Grant',
    cmsCategory: 'Nature of Payment',
    definition: 'A payment to a covered recipient to support a specific cause or activity.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_honoraria',
    letter: 'H',
    term: 'Honoraria',
    cmsCategory: 'Nature of Payment',
    definition:
      'Similar to consulting fees, but generally reserved for a brief, one-time activity. Another distinction is that honoraria are generally provided for services without a set price.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_long_term_device_loan',
    letter: 'L',
    term: 'Long-term medical supply or device loan',
    cmsCategory: 'Nature of Payment',
    definition:
      'The loan of supplies or a device for a total of 91 days or longer, regardless of whether the loan was 90 consecutive days.',
    programYearNote: 'Added beginning with Program Year 2021. Previous program years do not include this category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_medical_education_faculty',
    letter: 'M',
    term: 'Medical Education Faculty/Speaker Compensation',
    cmsCategory: 'Nature of Payment',
    definition: 'Compensation for serving as faculty or as a speaker for medical education program.',
    programYearNote: 'Program Year 2021+ consolidated category.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_npi',
    letter: 'N',
    term: 'National Provider Identifier (NPI)',
    cmsCategory: 'General definitions',
    definition:
      'An NPI, or National Provider Identifier, is a unique, random number assigned to each covered health care provider. It is used to identify the provider in administrative and financial transactions according to Health Insurance Portability and Accountability Act (HIPAA) standards. NPIs are assigned through the National Plan and Provider Enumeration System (NPPES).',
    regulatoryBasis: 'HIPAA; CMS Open Payments data dictionary',
  },
  {
    id: 'cms_natures_of_payment',
    letter: 'N',
    term: 'Natures of Payment',
    cmsCategory: 'Nature of Payment',
    definition:
      'Categories that must be used to describe why a payment or other transfer of value was made (42 CFR 403.904(e)(2)). CMS categories include: Acquisitions; Charitable contributions; Compensation for services other than consulting; Compensation for faculty/speaker at medical education programs; Consulting fees; Current or prospective ownership or investment interest; Debt Forgiveness; Education; Entertainment; Food and beverage; Gift; Grant; Honoraria; Long-term medical supply or device loan; Royalty or license; Space rental or facility fees (teaching hospitals only); Travel and lodging.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
    conditions: ['Program Year 2021+ adds Acquisitions, Debt Forgiveness, Long-term loan categories'],
  },
  {
    id: 'cms_newly_added_recipients',
    letter: 'N',
    term: 'Newly Added Covered Recipients',
    cmsCategory: 'General definitions',
    definition:
      'Open Payments expanded in January 2021 to include five new provider types: physician assistants, nurse practitioners, clinical nurse specialists, certified registered nurse anesthetists & anesthesiologist assistants, and certified nurse-midwives.',
    programYearNote: 'Effective January 2021 for Program Year 2021 reporting and forward.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_npp',
    letter: 'N',
    term: 'Non-Physician Practitioner Covered Recipient',
    cmsCategory: 'General definitions',
    definition:
      'Health care providers who practice either in collaboration with or under the supervision of a physician, including physician assistants, nurse practitioners, and clinical nurse specialists, are referred to as non-physician practitioners (NPPs). NPPs are reportable covered recipients when they meet CMS criteria and are not bona fide employees of the reporting entity.',
    programYearNote: 'Reportable as covered recipients beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_nurse_practitioner',
    letter: 'N',
    term: 'Nurse Practitioner',
    cmsCategory: 'General definitions',
    definition:
      'A nurse practitioner who performs such services as such individual is legally authorized to perform (in the State in which the individual performs such services) in accordance with State law (or the State regulatory mechanism provided by State law), and who meets such training, education, and experience requirements (or any combination thereof) as the Secretary may prescribe in regulations.',
    programYearNote: 'Included as a covered recipient type beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_ownership_type',
    letter: 'O',
    term: 'Ownership',
    cmsCategory: 'Type of Payment',
    definition:
      'Ownership and investment interest in companies, which describes both the actual dollar amount invested and the value of the ownership or investment interest. Records may have one or both of these values associated with them.',
    conditions: ['Amount Invested: total dollar value gained during reporting year only', 'Value of Interest: cumulative current value as of most recent feasible valuation date'],
  },
  {
    id: 'cms_amount_invested',
    letter: 'O',
    term: 'Amount Invested',
    cmsCategory: 'Type of Payment',
    definition:
      'The total dollar value of the ownership interest gained by the physician (or the physician\'s immediate family members) in the Applicable Manufacturer or Applicable GPO during the reporting year only. Value reported is for the entire calendar year.',
  },
  {
    id: 'cms_value_of_interest',
    letter: 'O',
    term: 'Value of Interest',
    cmsCategory: 'Type of Payment',
    definition:
      'The current cumulative value of ownership or investment interest held by the physician (or the physician\'s immediate family members) in the Applicable Manufacturer or Applicable GPO as of the most recent feasible valuation date preceding the reporting date. Represents cumulative value of all ownership interests held.',
  },
  {
    id: 'cms_ownership_investment_interest',
    letter: 'O',
    term: 'Ownership or Investment Interest',
    cmsCategory: 'General definitions',
    definition:
      'Ownership and investment interest includes, but is not limited to: stock; stock option(s) (other than those received as compensation, until exercised); partnership share(s); limited liability company membership(s); loans; bonds; or other financial instruments secured with an entity\'s property or revenue. May be direct or indirect through debt, equity or other means. Exceptions apply per 42 CFR 403.902.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_physician',
    letter: 'P',
    term: 'Physician',
    cmsCategory: 'General definitions',
    definition:
      'For the purposes of Open Payments, a “physician” is any of the following types of professionals that are legally authorized by the state to practice, regardless of whether they are Medicare, Medicaid, or CHIP providers: Doctors of Medicine or Osteopathic Medicine; Doctors of Dental Medicine or Dental Surgery; Doctors of Podiatric Medicine; Doctors of Optometry; Chiropractors. Note: Medical residents are excluded from the definition of physicians for the purpose of this program.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_physician_assistant',
    letter: 'P',
    term: 'Physician Assistant',
    cmsCategory: 'General definitions',
    definition:
      'A physician assistant who performs such services as such individual is legally authorized to perform (in the State in which the individual performs such services) in accordance with State law (or the State regulatory mechanism provided by State law), and who meets such training, education, and experience requirements (or any combination thereof) as the Secretary may prescribe in regulations.',
    programYearNote: 'Included as a covered recipient type beginning January 2021.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_reporting_entities',
    letter: 'R',
    term: 'Reporting Entities',
    cmsCategory: 'General definitions',
    definition:
      'Reporting entities are applicable manufacturers or applicable GPOs. See definitions for applicable manufacturer and applicable group purchasing organization (GPO) for more details.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_research',
    letter: 'R',
    term: 'Research',
    cmsCategory: 'General definitions',
    definition:
      'Research is a systematic investigation to develop or contribute to generalized knowledge about public health, including behavioral and social-sciences research. This definition includes basic and applied research, and product development.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_research_payment',
    letter: 'R',
    term: 'Research Payment',
    cmsCategory: 'Type of Payment',
    definition: 'Payments that are associated with a research study.',
    conditions: ['Linked to research study / clinical trials identifier where applicable'],
  },
  {
    id: 'cms_royalty_license',
    letter: 'R',
    term: 'Royalty or License',
    cmsCategory: 'Nature of Payment',
    definition: 'Payments based on sales of products that use a physician\'s intellectual property.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_space_rental',
    letter: 'S',
    term: 'Space Rental or Facility Fees',
    cmsCategory: 'Nature of Payment',
    definition:
      'Payments or fees associated with renting a space or facility. This nature of payment category is applicable only to Teaching Hospital covered recipients.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
    conditions: ['Teaching Hospital covered recipients only'],
  },
  {
    id: 'cms_teaching_hospital',
    letter: 'T',
    term: 'Teaching Hospital',
    cmsCategory: 'General definitions',
    definition:
      'For the purposes of Open Payments, “teaching hospitals” are hospitals that received payment for Medicare direct graduate medical education (GME), inpatient prospective payment system (IPPS) indirect medical education (IME), or psychiatric hospital IME programs during the last calendar year for which such information is available.',
    regulatoryBasis: '42 CFR 403.902',
  },
  {
    id: 'cms_third_parties',
    letter: 'T',
    term: 'Third Parties',
    cmsCategory: 'General definitions',
    definition:
      'Third parties are other individuals or entities, whether or not they operate in the United States. Third-party payment recipient indicators must be reported when payment is made to a third party on behalf of a covered recipient.',
    regulatoryBasis: '42 CFR 403.902; CMS PUF third-party fields',
  },
  {
    id: 'cms_travel_lodging',
    letter: 'T',
    term: 'Travel and Lodging',
    cmsCategory: 'Nature of Payment',
    definition:
      'Any compensation for costs associated with travel, such as hotel fees, airfare, mileage, and cab fare.',
    regulatoryBasis: '42 CFR 403.904(e)(2)',
  },
  {
    id: 'cms_transfers_of_value',
    letter: 'T',
    term: 'Transfers of Value',
    cmsCategory: 'General definitions',
    definition:
      'Payments or other transfers of value are anything of value given by an applicable manufacturer or applicable GPO to a covered recipient or physician owner/investor that does not fall within one of the excluded categories in the rule.',
    regulatoryBasis: '42 CFR 403.902',
  },
]

export const CMS_GLOSSARY_LETTERS = [...new Set(CMS_OPEN_PAYMENTS_GLOSSARY.map((e) => e.letter))].sort()

export function getCmsGlossaryByLetter(letter: string): CmsOpenPaymentsGlossaryEntry[] {
  return CMS_OPEN_PAYMENTS_GLOSSARY.filter((e) => e.letter === letter.toUpperCase())
}

export function getCmsGlossaryByCategory(category: CmsGlossaryCategory): CmsOpenPaymentsGlossaryEntry[] {
  return CMS_OPEN_PAYMENTS_GLOSSARY.filter((e) => e.cmsCategory === category)
}
