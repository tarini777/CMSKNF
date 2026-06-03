# CMS Compliance Platform — Documentation Index

| Document | Purpose |
|----------|---------|
| [API Integration Guide](./API_INTEGRATION_GUIDE.md) | External APIs (CMS FHIR, PubMed, ClinicalTrials, Open Payments) |
| [Connectivity Checklist](./CONNECTIVITY_CHECKLIST.md) | Verify all services are connected (live vs demo) |
| [International Reporting Rules](./INTERNATIONAL_REPORTING_RULES.md) | Outside-U.S. CMS fields and geographic rules |
| [Multi-Jurisdiction Reporting](./MULTI_JURISDICTION_REPORTING.md) | Americas, Europe, UK — EFPIA, ABPI, national regimes |
| [User Manual](./USER_MANUAL.md) | End-user workflows |
| [Product Manual](./PRODUCT_MANUAL.md) | Product capabilities |
| [Value Propositions](./VALUE_PROPOSITIONS.md) | Business value by persona |
| [CMS FHIR Troubleshooting](./CMS_FHIR_TROUBLESHOOTING.md) | FHIR API issues |
| [PubMed Troubleshooting](./PUBMED_API_TROUBLESHOOTING.md) | PubMed E-utilities issues |
| [ClinicalTrials Troubleshooting](./CLINICALTRIALS_API_TROUBLESHOOTING.md) | ClinicalTrials.gov issues |

## Quick connectivity test

With the dev server running (`npm run dev`):

```bash
./scripts/test-real-data.sh
# or
curl -s http://localhost:3000/api/connectivity | jq .
```

## Rules & glossary API

```bash
# All reportability rules
curl -s "http://localhost:3000/api/glossary?action=rules" | jq '.data.rules | length'

# Geographic / international rules only
curl -s "http://localhost:3000/api/glossary?action=rules&category=geographic" | jq '.data.rules[].name'
```
