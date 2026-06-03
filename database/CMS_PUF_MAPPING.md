# CMS Public Use File (PUF) Field Mapping

Aligned to **Open Payments Methodology Overview & Data Dictionary — January 2025**  
PDF: [open_payments_data_dictionary_methodology-january_2025.pdf](../docs/open_payments_data_dictionary_methodology-january_2025.pdf)

Type definitions: `cms-compliance-nextjs/src/types/cms-puf.ts`  
Mapper: `cms-compliance-nextjs/src/lib/lineage/puf-field-mapper.ts`  
Export: `cms-compliance-nextjs/src/lib/lineage/puf-export-service.ts`

---

## Three CMS file types

| Appendix | File | Program years | Platform model | Fields |
|----------|------|---------------|----------------|--------|
| **B** | General Payments Detail | 2016+ | `CmsGeneralPaymentLine` | **91** |
| **D** | Research Payments Detail | 2016+ | `CmsResearchPaymentLine` | **252+** (JSON) |
| **F** | Physician Ownership Information | All PYs | `CmsOwnershipPaymentLine` | **30** |

CMS live API dataset IDs (2024):

| Category | Dataset UUID |
|----------|--------------|
| General | `e6b17c6a-2534-4207-a4a1-6746a14911ff` |
| Research | `2f15cb85-8887-4dcc-a318-1f8ec1d815b3` |
| Ownership | `9ac4f7f8-b6e4-4d80-8410-4aba7e71dd02` |

API base: `https://openpaymentsdata.cms.gov/api/1`

---

## General payment — 91 fields

Stored in `cms_general_payment_lines.puf_fields` as typed JSON. Export emits all 91 columns in CMS dictionary order (`CMS_GENERAL_PUF_HEADERS`).

### Field groups

| Group | Fields | Examples |
|-------|--------|----------|
| Publication metadata | 3 | `change_type`, `program_year`, `payment_publication_date` |
| Recipient identity | 12 | `covered_recipient_npi`, `covered_recipient_profile_id`, name parts |
| Recipient address | 9 | `recipient_city`, `recipient_state`, `recipient_zip_code`, … |
| Recipient type / specialty | 12 | `covered_recipient_primary_type_1–6`, `covered_recipient_specialty_1–6` |
| License states | 5 | `covered_recipient_license_state_code1–5` |
| Teaching hospital | 3 | `teaching_hospital_ccn`, `teaching_hospital_id`, `teaching_hospital_name` |
| Manufacturer / GPO | 5 | `applicable_manufacturer_or_applicable_gpo_making_payment_name`, … |
| Payment core | 6 | `total_amount_of_payment_usdollars`, `date_of_payment`, form, nature |
| Travel | 3 | `city_of_travel`, `state_of_travel`, `country_of_travel` |
| Third party / charity | 5 | `third_party_payment_recipient_indicator`, `charity_indicator`, … |
| Context / dispute | 4 | `contextual_information`, `dispute_status_for_publication`, … |
| Product attribution | 26 | `covered_or_noncovered_indicator_1–5`, NDC, PDI, therapeutic area, … |
| Record id | 1 | `record_id` |

### Legacy CSV alias support

Upload mapper accepts both **2024 CMS API snake_case** and **legacy PascalCase** headers:

| CMS 2024 field | Legacy upload alias |
|----------------|---------------------|
| `covered_recipient_first_name` | `Physician_First_Name` |
| `covered_recipient_npi` | `Physician_NPI` |
| `covered_recipient_specialty_1` | `Physician_Specialty` |
| `related_product_indicator` | `Product_Indicator` |
| `name_of_drug_or_biological_or_device_or_medical_supply_1` | `Name_of_Associated_Covered_Drug_or_Biological1` |

### Coverage vs. legacy `cms_records`

| Store | General field coverage |
|-------|------------------------|
| `cms_records` (Prisma) | ~51 / 91 explicit columns |
| `cms_general_payment_lines.puf_fields` | **91 / 91** |

New uploads populate **both**; export prefers PUF lines.

---

## Research payment — 252+ fields

Research records extend general payment shape with study / PI blocks. Stored as:

- **Denormalized columns:** `name_of_study`, `clinical_trials_id`, `preclinical_indicator`, `total_amount`, `program_year`
- **Full payload:** `puf_fields` JSON including all `principal_investigator_*` and `expenditure_category*` fields from raw ingest

Key research-only fields (Appendix D):

| Field | Purpose |
|-------|---------|
| `clinicaltrials_gov_identifier` | NCT linkage |
| `name_of_study` | Protocol name |
| `context_of_research` | Narrative |
| `preclinical_research_indicator` | Preclinical flag |
| `expenditure_category1–6` | CMS research categories |
| `noncovered_recipient_entity_name` | Entity payee |
| `principal_investigator_1_*` | PI identity block (repeated for PI 2–5 in full JSON) |

Rules engine sets `cmsReportCategory: 'research'` → ingest creates `CmsResearchPaymentLine`.

---

## Ownership — 30 fields

Stored in `cms_ownership_payment_lines.puf_fields`. Export via `CMS_OWNERSHIP_PUF_HEADERS`.

| Field | Notes |
|-------|-------|
| `physician_npi` | Required for CMS match |
| `total_amount_invested_usdollars` | Not `total_amount_of_payment_usdollars` |
| `value_of_interest` | Dollar value of ownership interest |
| `terms_of_interest` | Text description |
| `interest_held_by_physician_or_an_immediate_family_member` | Y/N |

Local reference file: `OP_DTL_OWNRSHP_PGYR2024_*.csv` (repo root, gitignored).

---

## `change_type` values (Table 3-2)

| Value | Meaning |
|-------|---------|
| `N` | New record (default on ingest) |
| `C` | Changed record |
| `D` | Deleted record (refresh publication removes) |

Set on PUF line at export time when correcting prior submission.

---

## Export endpoints

| Output | Endpoint | Columns |
|--------|----------|---------|
| General PUF CSV | `GET /api/lineage?action=export-general&programYear=2024` | 91 |
| Legacy subset | `GET /api/transparency/export` | 29 (fallback) |
| Transparency attestation | `GET /api/transparency/attestation` | Checklist metadata |

Export filter: `is_reportable = true`, excludes active disputes per `cms_records.dispute_workflow_status`.

---

## Validation rules (CMS §2.5)

Records must be:

1. **Successfully validated** against CMS field rules  
2. **Matched** to valid physician, NPP, or teaching hospital  

Platform enforcement:

- `HcpMaster.match_status` tracks NPI / profile verification  
- Transparency rules flag unmatched recipients before submission  
- `dispute_status_for_publication` synced from dispute workflow  

---

## Versioning

| Artifact | Version constant |
|----------|------------------|
| PUF field mapper | `NORMALIZATION_VERSION = cms-puf-mapper-2025-01` |
| Rules engine | `RULES_ENGINE_VERSION = transparency-rules-1.0` |
| Data dictionary | January 2025 (OMB 0938-1237) |

When CMS publishes dictionary updates, bump mapper version and re-normalize pending lines.
