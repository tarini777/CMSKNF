# Source Connector Field Mappings

Implementation: `cms-compliance-nextjs/src/lib/lineage/connectors/`

## Supported connectors (Option 2)

| `source_key` | System | Category | Mapper version |
|--------------|--------|----------|----------------|
| `concur` | SAP Concur T&E | travel | `concur-mapper-1.0` |
| `veeva_crm` | Veeva CRM | crm | `veeva-crm-mapper-1.0` |
| `vendor_med_ed` | Third-party med-ed vendor | vendor | `vendor-med-ed-mapper-1.0` |
| `tmc` | Travel Management Company | vendor | `tmc-mapper-1.0` |

## Pipeline

```
Upstream JSON/XML/CSV row
  → mapConnectorPayload()     # field mapping + nature enrichment
  → SourceTransaction         # rawPayload + payloadHash (dedupe)
  → transparency rules
  → SpendEvent + PUF line + CMSRecord
```

## API

| Method | Endpoint | Action | Body |
|--------|----------|--------|------|
| GET | `/api/lineage/connectors` | `list` | — |
| GET | `/api/lineage/connectors?action=mapping&sourceKey=concur` | field map + sample | — |
| GET | `/api/lineage/connectors?action=preview&sourceKey=concur` | sample canonical row | — |
| POST | `/api/lineage/connectors` | `preview` | `{ sourceKey, payload }` |
| POST | `/api/lineage/connectors` | `ingest` | `{ sourceKey, payload, reviewSessionId? }` |
| POST | `/api/lineage/connectors` | `ingest-batch` | `{ sourceKey, payloads: [] }` |

### Example: ingest Concur expense

```bash
curl -s -X POST http://localhost:3000/api/lineage/connectors \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "ingest",
    "sourceKey": "concur",
    "payload": {
      "ReportId": "RPT-2024-88421",
      "ExpenseId": "EXP-99182",
      "TransactionDate": "2024-03-15",
      "PostedAmount": "125.50",
      "ExpenseType": "Business Meal",
      "AttendeeFirstName": "Jane",
      "AttendeeLastName": "Doe",
      "AttendeeNPI": "1234567890",
      "CompanyCode": "Gilead Sciences, Inc."
    }
  }' | jq .
```

## UI

Dashboard → **Lineage** tab → **Source Connectors** panel

- View field mappings per connector
- Preview sample canonical row
- One-click sample ingest into lineage

## Third-party / indirect spend

`vendor_med_ed` and `tmc` connectors set:

- `third_party_payment_recipient_indicator = Y`
- `name_of_third_party_entity_receiving_payment_or_transfer_of_value` = vendor/TMC name

This closes the indirect attribution gap described in [SOURCE_SYSTEMS.md](./SOURCE_SYSTEMS.md).

## Next: Option 3 & Dedup UI

- **Option 3:** Expand `CMSRecord` or migrate Records UI to PUF lines
- **Dedup UI:** Cross-source `dedupClusterId` when Concur + Cvent describe same event

See [ARCHITECTURE.md](./ARCHITECTURE.md).
