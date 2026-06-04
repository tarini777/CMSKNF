# Source Connector Field Mappings

Implementation: `cms-compliance-nextjs/src/lib/lineage/connectors/`

Runtime: **PostgreSQL** (`DATABASE_URL`, default host port **5433** via root `docker-compose.yml`).

## Supported connectors

| `source_key` | System | Category | Mapper version |
|--------------|--------|----------|----------------|
| `concur` | SAP Concur T&E | travel | `concur-mapper-1.0` |
| `cvent` | Cvent events | engagement | `cvent-mapper-1.0` |
| `veeva_crm` | Veeva CRM | crm | `veeva-crm-mapper-1.0` |
| `vendor_med_ed` | Third-party med-ed vendor | vendor | `vendor-med-ed-mapper-1.0` |
| `tmc` | Travel Management Company | vendor | `tmc-mapper-1.0` |
| `ctms` | Clinical trial management | clinical | `ctms-mapper-1.0` |
| `greenphire` | Greenphire clinical payments | clinical | `greenphire-mapper-1.0` |

## Reference / MDM connectors (not spend ingest)

| `source_key` | System | Category | API version |
|--------------|--------|----------|-------------|
| `nppes` | CMS NPPES Read API | mdm | `2.1` |

| Endpoint | Purpose |
|----------|---------|
| `GET /api/connectors/nppes` | NPPES connector metadata + health check |
| `POST /api/connectors/nppes` | Verify NPI (`action=verify`), raw lookup (`lookup`), or search (`search`) |
| `POST /api/nppes/verify` | Verify NPI against a CMS record (by NPI or `recordId`) |
| `POST /api/connectors/fmv/sync` | Sync CLM / `fmv_engine` rates → `fmv_rates` table |
| `GET /api/connectors/fmv/sync` | List active FMV rates |

NPPES uses the CMS public Read API (`https://npiregistry.cms.hhs.gov/api/?version=2.1`) — no API key required. NPI issuance does not validate licensure or credentialing. Ingest policy: `NPPES_INGEST_POLICY=off|warn|block`.

## Pipeline

```
Upstream JSON/XML/CSV row
  → mapConnectorPayload()     # field mapping + nature enrichment
  → NPPES verification        # `/api/connectors/nppes` · ingest-time (NPPES_INGEST_POLICY)
  → SourceTransaction         # rawPayload + payloadHash (dedupe)
  → transparency rules
  → SpendEvent + PUF line + CMSRecord
  → aggregate job (jurisdiction_rules)
```

## API

| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| GET | `/api/lineage/connectors` | `list` | — |
| GET | `/api/lineage/connectors?action=mapping&sourceKey=concur` | field map + sample | — |
| POST | `/api/lineage/connectors` | `ingest` | `{ sourceKey, payload }` |
| POST | `/api/lineage/connectors` | `ingest-batch` | `{ sourceKey, payloads: [] }` |
| GET | `/api/transparency/puf-validation` | Jan 2025 PUF validation report | — |
| GET | `/api/transparency/export/international?jurisdiction=fr\|uk` | FR / UK disclosure CSV | — |
| GET | `/api/transparency/attestation/pack` | Attestation PDF pack | — |
| POST | `/api/jobs/aggregate` | Scheduled aggregate recalc | `{ programYear }` |

## UI

Dashboard → **Lineage** tab → **Source Connectors** panel  
Dashboard → **Submit** tab → OPS bundle, FR/UK exports, attestation PDF

## Third-party / indirect spend

`vendor_med_ed` and `tmc` connectors set third-party PUF indicators for CMS indirect attribution.

## Research payments

`ctms` and `greenphire` map protocol, NCT, PI identity, and study metadata into `cms_research_payment_lines.puf_fields`. Rules engine assigns `cmsReportCategory: research` when nature includes research/grant/clinical study.

See [CMS_PUF_MAPPING.md](./CMS_PUF_MAPPING.md) and [ARCHITECTURE.md](./ARCHITECTURE.md).
