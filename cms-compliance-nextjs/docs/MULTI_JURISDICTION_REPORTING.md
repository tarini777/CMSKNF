# Multi-Jurisdiction Reporting — Americas, Europe & UK

This platform catalogs **national transparency regimes** equivalent to:

- **U.S.** CMS Open Payments (Sunshine Act)
- **EU** EFPIA Disclosure Code (“EU Sunshine Act”)
- **UK** ABPI Disclosure UK
- **France** Loi Bertrand / one-key
- **Brazil** Lei 13.331/2016
- And country-specific codes across the Americas and Europe

## Coverage summary

| Region | Countries | Key regimes |
|--------|-----------|-------------|
| North America | US, CA, MX | CMS Open Payments, Quebec Bill 150, CANIFARMA |
| Central America | 7 | Industry codes / monitor |
| Caribbean | 13 | Monitor local association codes |
| South America | 12 | Brazil, Colombia, Chile mandatory; others vary |
| United Kingdom | GB | **ABPI Disclosure UK** (post-Brexit) |
| Western Europe | AT, BE, CH, DE, FR, LU, NL, … | **EFPIA**, Loi Bertrand, FSA, CGR |
| Northern Europe | DK, EE, FI, IE, IS, LI, NO, SE, LV, LT | **EFPIA** / LMI Norway |
| Southern Europe | CY, ES, GR, IT, MT, PT, RO, SI, SK, … | **EFPIA** / Farmindustria |
| Eastern Europe & Balkans | AL, BA, BG, BY, HR, CZ, HU, MD, ME, MK, PL, RS, RU, TR, UA, … | EFPIA where EU member; IEIS Turkey; monitor others |

## API usage

### List all countries

```bash
curl -s "http://localhost:3000/api/glossary?action=countries" | jq '.data.countries | length'
```

### Filter by region

```bash
curl -s "http://localhost:3000/api/glossary?action=countries&region=united_kingdom" | jq '.data.countries[0]'
```

### Lookup single country

```bash
curl -s "http://localhost:3000/api/glossary?action=regime&country=France" | jq '.data.regime.sunshineActEquivalent'
```

### Multi-jurisdiction analysis on a payment record

```bash
curl -s -X POST http://localhost:3000/api/glossary \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze_jurisdictions",
    "data": {
      "record": {
        "totalAmountOfPaymentUsdollars": 12000,
        "natureOfPaymentOrTransferOfValue": "Consulting Fee",
        "coveredRecipientName": "Dr. Marie Dupont",
        "recipientCountry": "France"
      }
    }
  }' | jq '.data'
```

Returns:

- U.S. CMS evaluation (always)
- Primary national regime (e.g. Loi Bertrand + EFPIA for France)
- UK ABPI when `recipientCountry` is United Kingdom
- Travel-destination regime when `countryOfTravel` is set

## UI

**Glossary & Rules → Americas & Europe** tab lists all regimes with search and region filter.

**Reportability Analysis** includes applicable national regimes in results.

## Important notes

1. **Dual reporting** — U.S. CMS obligations remain for applicable U.S. manufacturers **in addition to** local regimes.
2. **EFPIA** — Applies across EU/EEA industry members via national portals (Farmindustria, LEEM, etc.).
3. **UK** — Post-Brexit uses **ABPI Disclosure UK**, not EFPIA directly.
4. **Monitor-only countries** — No mandatory national Sunshine equivalent catalogued; track local association codes.
5. **Legal review** — This catalog supports compliance workflow; confirm thresholds and scope with legal/regulatory affairs.

## Related docs

- [International Reporting Rules (CMS fields)](./INTERNATIONAL_REPORTING_RULES.md)
- [Connectivity Checklist](./CONNECTIVITY_CHECKLIST.md)
- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
