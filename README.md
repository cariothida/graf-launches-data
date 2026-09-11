# graf.ae — New Launches data feed

Single source of truth for the **New & upcoming launches** section of [graf.ae](https://graf.ae).
Maintained automatically by ChatGPT's daily launch research. Consumed at build time by the
graf.ae repository's sync workflow — every merged change here becomes static, SEO-complete
pages on the site (~40 minutes after commit), with no human in the loop.

## Contract

- **One file matters: `launches.json`.** It must always validate against `schema.json`
  (JSON Schema 2020-12). A commit that breaks validation is skipped by the site sync and
  reported — it will NOT take the site down, but it also won't publish.
- **`id` is permanent.** It becomes the public URL `graf.ae/launches/<id>/`. Never rename
  an id; if a project's name changes, keep the id, update `project`, and add nothing to
  `aliases` (aliases are for retiring OLD ids of the same project).
- **One project = one record.** Update the existing record; never add a second record for
  the same project (the sync deduplicates by `id`, `aliases`, and the
  developer+project+location combination, and will reject duplicates).
- **Status drives publication:**
  - `confirmed` — officially announced by the developer → full indexed page.
  - `broker-intelligence` — multi-source broker signal, no official confirmation → indexed
    page with explicit caution wording; prices render only as "broker indication".
  - `rumour` — weak/single-source → **no page is generated** until the status is upgraded.
- **Prices are guilty until proven confirmed.** `startingPrice`/`pricePerSqft` render as
  facts only with `priceConfirmed: true` (developer price list). Everything else goes in
  `brokerPriceNote` with attribution. The site will never print an unconfirmed number as
  a fact — records trying to do so are the one thing the sync refuses hardest.
- **Unknown stays unknown.** Omit fields rather than guess; the site renders honest
  "To be confirmed / Not yet released" states by design.
- **`updatedAt`** changes only on substantive updates (it feeds the visible "Updated" date
  and `dateModified` in structured data).
- Existing hand-researched entries on the site take precedence: a feed record whose id or
  identity collides with a manually authored entry is skipped and logged, not merged.

## Example record

```json
{
  "id": "ellington-business-bay-offices",
  "project": "Business Bay offices (working name)",
  "developer": "Ellington Properties",
  "developerId": "ellington",
  "emirate": "Dubai",
  "location": "Business Bay entrance, beside Sheikh Zayed Road (broker-placed)",
  "type": ["offices"],
  "status": "broker-intelligence",
  "launchWindow": "Coming soon",
  "startingPrice": null,
  "priceConfirmed": false,
  "brokerPriceNote": "Brokers circulate ~AED 2,500/sqft; unconfirmed by Ellington.",
  "teaser": "A Grade-A office tower signal in Business Bay.",
  "whatNext": "Awaiting Ellington's official project name and launch details.",
  "confidenceNote": "No official Ellington announcement found yet.",
  "sources": [
    { "url": "https://example-broker.com/post", "label": "Broker preview", "date": "2026-09-10", "primary": true }
  ],
  "firstReported": "2026-09-10",
  "updatedAt": "2026-09-11",
  "published": true
}
```

## Plumbing

Push to `main` here triggers `repository_dispatch` to the graf.ae repository (workflow in
`.github/workflows/notify-site.yml`, requires the `SITE_DISPATCH_TOKEN` secret — a
fine-grained PAT with **Contents: read-and-write** on the site repo, which is what the
`repository_dispatch` REST endpoint actually requires for fine-grained tokens). The site also polls daily as a
fallback, so a missing token delays publication by at most a day, it never loses data.

## Validation is code, not prose

The site's sync handler (graf.ae repo, `scripts/sync-launches.mjs`) enforces, with tests:

- JSON Schema validation including the conditional price rule (`priceConfirmed: false`
  → `startingPrice` and `pricePerSqft` must be `null`; `priceConfirmed: true` →
  `confirmedBy` developer source required) — the rule lives in `schema.json` `allOf`.
- Cross-record checks the schema cannot express: unique `id` across records and against
  every existing page's id + aliases; unique developer+project+location(+parentId/phase)
  identity; exactly one `primary` source per record.
- Phases/towers: records sharing `parentId` but differing in `phase` are distinct
  releases and are NOT deduplicated into one.
- Failure mode: an invalid feed changes nothing — the site keeps the last valid
  generation and the run reports which records were rejected and why. Validation makes
  data publishable, not true: content honesty rules (broker labeling, unknowns stay
  unknown) are applied at render regardless.

Optional new fields (`seoTitle`, `seoDescription`, `unitMix`, `eoi`, `parentId`,
`phase`, `confirmedBy`) are in `schema.json`; do not add fields that are not in the
schema — `additionalProperties: false` will reject the record.
