# End-to-end demo script (~20 min)

Run after `npm run dev` and `npx prisma db seed` (or fresh DB).

**Base URL:** http://localhost:3000  
**Program year:** active PY badge in header (Jan–Jun = prior calendar year)

---

## Before you start

```bash
cd /Users/tarini/CMSKNF
docker compose up postgres -d

cd cms-compliance-nextjs
npx prisma migrate deploy
npx prisma db seed
npm run dev
```

Open http://localhost:3000

> **Note:** Run each line separately. Do not paste inline `# comments` — shells and npm treat `#` as part of the command.

**Demo logins** (optional — auth is off by default):

| Persona | Email | Password |
|---------|-------|----------|
| Maria (Compliance) | compliance@cms-compliance.local | compliance123 |
| Derek (Data) | analyst@cms-compliance.local | analyst123 |
| Sam (Platform) | admin@cms-compliance.local | admin123 |
| Priya (Exec) | exec@cms-compliance.local | exec123 |

**Seed scenarios** (record IDs prefixed `SEED-DEMO-`):

| ID | Purpose |
|----|---------|
| `SEED-DEMO-JDOE` | NPI `1234567890` — HCP portal + FMV over benchmark |
| `SEED-DEMO-EU-PENDING` | France — consent tab |
| `SEED-DEMO-EU-YES` / `EU-NO` | Individual vs aggregate consent |
| `SEED-DEMO-DISPUTE` | Open dispute in Disputes tab |
| `SEED-DEMO-US-OK` | Approved US row for export |

---

## Act 1 — Data & lineage (Derek, ~5 min)

1. Open app → persona **DATA** (Derek).
2. **Lineage** — confirm spend events and PUF line counts.
3. *(Optional)* **Lineage → Dedup** → **Simulate collision** if no pending clusters.
4. **Ingest** — preview Concur sample ingest (Connectors panel).

**Say:** *Spend flows from source systems into lineage, rules, and CMS records.*

---

## Act 2 — Review, FMV, NPPES (Maria, ~5 min)

1. Switch persona **COMP** (Maria).
2. **Review** — open `SEED-DEMO-JDOE` (Jane Doe).
3. **Verify NPI (NPPES)** — should match demo registry.
4. **FMV check** — consulting $7,500 vs Cardiology benchmark → above FMV.
5. **Applied rules** — right pane shows active transparency rules.
6. Approve or reject a pending row.

**Say:** *Every payment gets rules, FMV, and identity checks before submission.*

---

## Act 3 — Consent & submission (Tomas / Maria, ~5 min)

1. Switch **COMP** or use **Submit** tab directly.
2. **Submit → Consent** — set Yes/No on `SEED-DEMO-EU-PENDING`.
3. **Submit → Checklist** — attestation readiness.
4. **Submit → OPS bundle** → **Preview bundle** → download General / Research / Ownership CSVs.
5. **Submit → Recalc** — aggregate thresholds.

**Say:** *EU consent drives individual vs aggregate disclosure; OPS bundle is ready for CMS portal upload.*

---

## Act 4 — HCP dispute loop (~5 min)

### HCP side (separate tab)

1. Open http://localhost:3000/hcp-review
2. NPI: `1234567890`, last name: `Doe` → **View my payments**
3. **Dispute this payment** on Jane Doe row with a short reason.

### Compliance side

4. **Submit → Disputes** — see new/updated dispute.
5. Advance status: Review → Disputed → Corrected → Resolved (with reason).

### Public disclosure

6. Open http://localhost:3000/disclosure — individual vs aggregate totals.

**Say:** *45-day HCP review feeds the same dispute workflow compliance uses; public site reflects consent splits.*

---

## Act 5 — Executive snapshot (Priya, ~2 min)

1. Persona **EXEC** (Priya).
2. **Home** — KPI pills (score, volume, queue).
3. **Submit → Timeline** — program-year milestones.

---

## Quick API checks (optional)

```bash
# Records
curl -s 'http://localhost:3000/api/records?page=1&per_page=5' | jq '.pagination'

# OPS bundle manifest
curl -s 'http://localhost:3000/api/transparency/export?programYear=2025&bundle=1' | jq '.data.files'

# HCP portal
curl -s 'http://localhost:3000/api/hcp-portal?npi=1234567890&lastName=Doe' | jq '.data.payments | length'

# Disclosure
curl -s 'http://localhost:3000/api/disclosure?programYear=2025' | jq '.data.summary'
```

---

## Reset demo data

```bash
# Re-seed only works on empty SEED-DEMO-* set; for full reset:
rm -f prisma/dev.db && npx prisma migrate dev && npx prisma db seed
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty OPS bundle | Re-run seed; ensure `SEED-DEMO-*` rows have `spendEventId` / PUF lines |
| HCP portal 404 | Use NPI `1234567890` + last name `Doe` |
| NPPES fails offline | Demo fallback still validates `1234567890` |
| Disputes tab empty | Run HCP dispute or check `SEED-DEMO-DISPUTE` |
