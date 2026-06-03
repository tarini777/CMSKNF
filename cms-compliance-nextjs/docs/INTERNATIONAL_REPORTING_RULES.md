# International & Outside-U.S. Reporting Rules

CMS Open Payments is a **U.S. program** (42 CFR Part 403). Applicable manufacturers and GPOs **operating in the United States** must report qualifying payments—even when recipients or travel occur **outside the United States**.

> **Important:** A non-U.S. recipient address does **not** exempt a payment from reporting.

## What the platform implements

Geographic rules live in `src/lib/glossary-service.ts` (category: `geographic`) and are applied on:

- CSV upload (`/api/upload`) via the rules engine
- Glossary analysis (`POST /api/glossary` action `analyze_reportability`)
- Review workflow (record detail shows country/travel fields)

### Rule summary

| Rule ID | Result | Description |
|---------|--------|-------------|
| `rule_foreign_recipient_reportable` | **Reportable** | Covered recipient outside U.S. + amount > $10 |
| `rule_travel_outside_us_reportable` | **Reportable** | Travel/lodging with Country of Travel ≠ U.S. |
| `rule_international_conference_travel` | **Reportable** | International conference/speaking travel |
| `rule_foreign_recipient_enhanced_review` | **Conditional** | Manual review for international address completeness |
| `rule_us_state_required_domestic` | **Conditional** | U.S. recipient missing state code (data quality) |
| `rule_us_territory_recipient` | **Reportable** | PR, GU, VI, AS, MP — standard rules apply |
| `rule_manufacturer_foreign_country_info` | **Conditional** | Manufacturer country is informational only |

## CMS data fields (international)

Map these columns in your CSV upload:

| CMS field | Platform field | Required when |
|-----------|----------------|---------------|
| `Recipient_Country` | `recipientCountry` | Non-U.S. recipient address |
| `Recipient_Province` | `recipientProvince` | Non-U.S. recipient address |
| `Recipient_Postal_Code` | `recipientPostalCode` | Non-U.S. recipient address |
| `Country_of_Travel` | `countryOfTravel` | Travel/lodging payments |
| `State_of_Travel` | `stateOfTravel` | Travel/lodging payments |
| `City_of_Travel` | `cityOfTravel` | Travel/lodging payments |
| `Applicable_Manufacturer_..._Country` | `applicableManufacturerOrApplicableGpoMakingPaymentCountry` | Manufacturer location (informational) |

## What is NOT exempt

- Physician consulting fees to a **U.S.-licensed physician practicing abroad**
- Grants to **CMS-listed teaching hospitals** regardless of travel location
- **Travel and lodging** for international medical congresses
- Payments above **$10** aggregate threshold to **covered recipients**

## What may be non-reportable (unchanged)

- Payments **below $10** (and below **$100** annual aggregate per recipient)
- **Bona fide employee** payments to manufacturer staff
- Specific **excluded categories** (e.g., certain patient-care items) per 42 CFR 403.904

## Verify rules in the app

```bash
curl -s "http://localhost:3000/api/glossary?action=rules&category=geographic" | jq '.data.rules[] | {id, name, result}'
```

Test analysis for a foreign recipient:

```bash
curl -s -X POST http://localhost:3000/api/glossary \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze_reportability",
    "data": {
      "record": {
        "totalAmountOfPaymentUsdollars": 5000,
        "natureOfPaymentOrTransferOfValue": "Consulting Fee",
        "coveredRecipientName": "Dr. Example",
        "coveredRecipientType": "Covered Recipient Physician",
        "recipientCountry": "Canada",
        "recipientProvince": "Ontario"
      }
    }
  }' | jq '.data'
```

Expected: `isReportable: true` with `rule_foreign_recipient_reportable` in `applicableRules`.

## Related docs

- [Connectivity Checklist](./CONNECTIVITY_CHECKLIST.md)
- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- [RULES.md](../RULES.md) — full business rules catalog
