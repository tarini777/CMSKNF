# Connectivity Checklist

Use this checklist to confirm all integrations are wired before demos or production cutover.

## One-command status

```bash
curl -s http://localhost:3000/api/connectivity | jq .
```

Expected response fields:

- `overall`: `healthy` | `degraded` | `offline`
- `checks[]`: per-service status
- `rulesSummary.includesInternationalReporting`: `true`

## Services

| Service | Health endpoint | Env vars | Live data |
|---------|-----------------|----------|-----------|
| Database | `/api/health` | `DATABASE_URL` | Always local SQLite unless Postgres configured |
| CMS FHIR | `/api/cms/fhir?action=health` | `CMS_FHIR_CLIENT_ID`, `CMS_FHIR_CLIENT_SECRET` | Demo without credentials |
| Open Payments | `/api/open-payments?action=health` | `OPEN_PAYMENTS_API_BASE_URL` | Public CMS DKAN API — [docs](https://openpaymentsdata.cms.gov/about/api) |
| PubMed | `/api/pubmed?action=health` | `PUBMED_EUTILS_BASE_URL` | Public NCBI API |
| ClinicalTrials.gov | `/api/clinicaltrials?action=health` | `CLINICALTRIALS_API_BASE_URL` | Public API |
| Glossary & rules | `/api/glossary?action=rules` | None (in-app) | Always loaded |
| Monitoring | `/api/monitoring/status?type=dashboard` | `API_MONITORING_ENABLED` | In-memory dashboard |

## Setup steps

1. Copy `env.example` → `.env.local`
2. Fill external API credentials (minimum: CMS FHIR for live healthcare validation)
3. `npm install && npx prisma generate && npm run dev`
4. Run `./scripts/test-real-data.sh`
5. Open app → **Monitoring** tab for live API health

## Status meanings

| Status | Meaning |
|--------|---------|
| `connected` | Service reachable with live or configured credentials |
| `demo` | Running with mock/demo fallback (CMS FHIR without credentials) |
| `degraded` | Reachable but slow or partial failure |
| `disconnected` | Cannot reach service — check network, URL, or credentials |

## Troubleshooting links

- [CMS FHIR](./CMS_FHIR_TROUBLESHOOTING.md)
- [PubMed](./PUBMED_API_TROUBLESHOOTING.md)
- [ClinicalTrials](./CLINICALTRIALS_API_TROUBLESHOOTING.md)
- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
