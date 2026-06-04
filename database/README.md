# CMS Compliance Platform — Database Documentation

This folder is the canonical reference for **data architecture**, **lineage**, and **CMS Open Payments submission schema** for the CMSKNF platform.

## Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | End-to-end data flow, tier model, and integration with source systems |
| [LINEAGE_SCHEMA.md](./LINEAGE_SCHEMA.md) | Entity-relationship model, table definitions, indexes, and status lifecycles |
| [CMS_PUF_MAPPING.md](./CMS_PUF_MAPPING.md) | Jan 2025 CMS Public Use File field alignment (general / research / ownership) |
| [SOURCE_SYSTEMS.md](./SOURCE_SYSTEMS.md) | Ten source-system categories mapped to `DataSource` registry and ingest paths |
| [CONNECTORS.md](./CONNECTORS.md) | Concur / Veeva / vendor connector field mappings and ingest API (Option 2) |
| [init.sql](./init.sql) | PostgreSQL bootstrap for Knowledge Nexus microservices (`data_nexus` landing zone) |

## Runtime vs. reference schema

| Environment | Location | Engine |
|-------------|----------|--------|
| **Application (current)** | `cms-compliance-nextjs/prisma/schema.prisma` | SQLite (`prisma/dev.db`) |
| **Production target** | `database/init.sql` + Prisma migrations | PostgreSQL |
| **CMS reference** | `docs/open_payments_data_dictionary_methodology-january_2025.pdf` | CMS Open Payments PUF spec |

The Prisma schema is the **source of truth** for the Next.js app. This `database/` folder documents intent, architecture, and cross-system coverage so DBAs and integrators do not need to read application code.

## Quick start

```bash
cd cms-compliance-nextjs
npx prisma db push          # apply lineage schema to SQLite
npm run db:seed             # users, rules, 20 data sources
npm run dev
```

After CSV upload, inspect lineage:

```bash
curl -s http://localhost:3000/api/lineage?action=stats | jq .
curl -s "http://localhost:3000/api/lineage?action=trace&spendEventId=<id>" | jq .
```

## CMS Open Payments PUF bulk load (local files)

> **Recommended:** Store bulk CSVs in Google Drive and keep metadata in [`manifest.json`](./manifest.json). See [`GDRIVE_SETUP.md`](./GDRIVE_SETUP.md).

Official CMS publication files under `database/`:

| Folder | Contents | Rows (approx.) |
|--------|----------|----------------|
| `PGYR2023_P01232026_01102026/` | General, research, ownership, removed/deleted (PY2023) | 15.8M |
| `PGYR2024_P01232026_01102026 (1)/` | General, research, ownership, removed/deleted (PY2024) | 16.2M |
| `PHPRFL_P01232026_01102026/` | Covered recipient profile supplement | 1.6M |

**Total:** ~33.5M payment/profile rows (~18 GB). CSV folders are **gitignored**; only [`manifest.json`](./manifest.json) is committed.

Load into Postgres (streaming import — profiles → payments → removed markers):

```bash
cd cms-compliance-nextjs
npm run db:import-puf -- --resume --batch-size 300
```

With Google Drive (runtime streaming, no local CSVs):

```bash
CMS_DATASET_STORAGE=gdrive npm run db:import-puf -- --resume --batch-size 300
```

Link Drive file IDs after upload:

```bash
npm run datasets:sync-gdrive
```

Inspect metadata:

```bash
curl -s http://localhost:3000/api/datasets?action=manifest | jq .
```

Export full 91-column general PUF CSV:

```bash
curl -s "http://localhost:3000/api/lineage?action=export-general&programYear=2024" -o general-puf-2024.csv
```

## Design principles

1. **Never lose the raw row** — every spend line traces to a `SourceTransaction.rawPayload` hash.
2. **Separate ingest from submission** — `SpendEvent` is normalized spend; PUF lines are CMS-shaped output.
3. **Three PUF types** — general (91 fields), research (252+), ownership (30); never flatten into one table.
4. **Auditable rules** — `ruleInputSnapshot` + `rulesEngineVersion` on every PUF line.
5. **MDM before match** — `HcpMaster` resolves NPI / CMS profile before CMS validation.

## Related application paths

| Path | Purpose |
|------|---------|
| `cms-compliance-nextjs/src/lib/lineage/ingest-pipeline.ts` | Upload → lineage orchestration |
| `cms-compliance-nextjs/src/lib/lineage/puf-field-mapper.ts` | Raw row → CMS PUF JSON |
| `cms-compliance-nextjs/src/types/cms-puf.ts` | Typed 91 / 30 column definitions |
| `cms-compliance-nextjs/src/app/api/lineage/route.ts` | Lineage REST API |
| `docs/CMS Transparency.md` | Business requirements (COM-TRANSP-001) |
