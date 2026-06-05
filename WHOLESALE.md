# Wholesale Store — Plan

A password-protected wholesale experience built inside a single Shopify page template.
Uses hash-based JS navigation to simulate a multi-page store (home → collections → product → cart).
No Shopify checkout. Order is submitted as a contact form email + PDF export.

The visual design matches the existing store exactly — same product cards, same header shell,
same typography and spacing. Components are reused where possible; new snippets created only
where the wholesale logic would make a shared file unreadable.

---

## Decisions Made

| Topic | Decision |
|---|---|
| Collections | Regular store collections, flagged with a metafield as wholesale-available |
| Wholesale pricing | Stored as a product/variant metafield (separate from retail price) |
| RRP | Also stored as a metafield, displayed alongside wholesale price |
| Currencies | EUR, GBP, USD — live rates fetched from open.er-api.com on page load (EUR base), fallback to hardcoded defaults |
| PDF | Branded — design/layout to be planned separately |
| Email | Buyer fills in their info → buyer receives copy, store inbox receives order |
| Password gate | Same sessionStorage pattern as `collection.secret.liquid` — password stored in `page.metafields.custom.password` |
| Page slug | `/pages/wholesale` — header detects via `page.handle == 'wholesale'` |
| Collections discovery | Loop all collections server-side, filter by `collection.metafields.custom.wholesale == true` |
| Data loading | Server-side: all wholesale data embedded as JS object in the page template (metafields accessible in Liquid, no AJAX/API needed) |
| Metafield keys | `custom.wholesale` (boolean, on collection), `custom.wholesale_price` (number EUR, on variant), `custom.rrp` (number EUR, on variant) |
| Out-of-stock variants | Show as disabled in size table (greyed out, qty locked to 0) |
| Cart persistence | sessionStorage (resets on tab/browser close) |
| Post-submit | Cart stays after submission |
| Component strategy | Hybrid — conditionals for small differences, new snippets for structurally different views |

---

## Architecture

### Single page template: `templates/page.wholesale.liquid`

Three views rendered inside one page, shown/hidden by JS based on `location.hash`:

```
#home           → landing / editorial section
#collections    → product grid, loaded via AJAX
#product/{handle} → product detail with size/qty table
#cart           → order summary, PDF export, email form
```

Browser back/forward works via the `hashchange` event.

---

## Component Strategy

Rule: if the wholesale difference is a few lines, use a conditional in the existing file.
If the wholesale version replaces a whole block of logic, create a new snippet.

| Component | Strategy | Detail |
|---|---|---|
| `snippets/header.liquid` | **Conditional** | Already handling archivesale this way. Detect `page.handle == 'wholesale'` and render wholesale left nav (Home / Collections / Cart + order counter) instead of SHOP/ABOUT/IMAGES |
| `snippets/product.liquid` | **Conditional via render param** | Pass `wholesale: true` when rendering from the wholesale template. Inside the snippet, swap the price block — show RRP + wholesale price instead of regular price. Card layout, images, slick slider unchanged |
| `snippets/cart.liquid` | **New: `wholesale-cart.liquid`** | Completely different — JS order object, editable qty table, totals in 2 price columns, no Shopify cart interaction |
| Product detail | **New: `wholesale-product-detail.liquid`** | Size/qty table replacing the variant selector. Images and title reuse the same markup, but the purchase UI is entirely different |
| Slick slider | **Reuse as-is** | No changes. Same init, same CSS |
| `scss/styles.scss` | **Additive only** | New wholesale-specific rules (size/qty table, order summary, buyer form, `@media print`) added at the bottom under a `/* Wholesale */` comment. Compiled via Gulp into `assets/style.css.liquid`. Never edit `style.css.liquid` directly. |
| `assets/scripts.js.liquid` | **No changes** | Wholesale JS lives in the page template itself, keeping it isolated |

---

## Build Phases

### Phase 1 — Template shell
- `templates/page.wholesale.liquid`
- Password gate (sessionStorage, same as archivesale)
- Four named view divs, all hidden by default
- JS router: on load and on `hashchange`, show the matching view

### Phase 2 — Header integration
- In `snippets/header.liquid`, detect `page.handle == 'wholesale'` (or similar)
- Replace `menu-left` with wholesale nav: Home / Collections / Cart + order counter
- Same pattern used for archivesale tag list

### Phase 3 — Homepage section
- `sections/wholesale-home.liquid` with customizer schema
- Blocks: banner image, headline, body text, CTA button
- Rendered via `{% section 'wholesale-home' %}` inside `#view-home`

### Phase 4 — Collections view
- On entering `#collections`, fetch all collections via Shopify AJAX API
- Filter client-side to only those with the wholesale metafield set to true
- Render collection cards → clicking enters `#collections/{collection-handle}`
- Inside a collection: fetch `/collections/{handle}/products.json`
- Render product cards (same HTML as existing `.product-card` so CSS reuses)

### Phase 5 — Product detail view
- Parse handle from hash, fetch `/products/{handle}.js`
- Render: image slider, title, RRP, wholesale price (in selected currency)
- Size/quantity table: one row per variant (size), qty input per row, stock indicator
- "Add to order" → appends lines to JS order object, updates cart counter
- Currency switcher visible here and on collections view

### Phase 6 — Wholesale cart
- JS object (also persisted to `sessionStorage` so refresh doesn't clear it)
- Displays: product name, size, qty, unit wholesale price, line total, order total
- Editable quantities, remove line button
- Shows both wholesale total and RRP total side by side
- Currency toggle affects all displayed prices

### Phase 7 — PDF export
- Hidden `#wholesale-print` div formatted as a branded order sheet
- Contains: buyer info, order lines, totals in selected currency, both price columns, date
- `window.print()` triggered with `@media print` CSS hiding everything except that div
- Logo and brand styling — layout to be designed separately

### Phase 8 — Email submission
- Standard Shopify contact form (`/contact`, POST)
- Buyer fills: name, company, email, phone, shipping address, notes
- JS serializes order lines into hidden fields before submit
- Store receives full order detail in inbox
- Buyer receives Shopify's auto-reply confirmation (can be customised in Shopify email settings)

---

## Data Model

### Metafields needed (to define in Shopify)

| Namespace + key | Type | On | Purpose |
|---|---|---|---|
| `custom.wholesale_enabled` | boolean | Collection | Flags collection as available in wholesale |
| `custom.wholesale_price` | money / number | Variant | Wholesale unit price |
| `custom.rrp` | money / number | Variant | RRP to display alongside |

### Currency handling
- 3 currencies (TBD — see Open Questions)
- Exchange rates: either hardcoded with a manual update process, or fetched from a free FX API on page load
- Prices stored in base currency (EUR assumed), converted client-side
- Selected currency stored in `sessionStorage`

---

## Open Questions

### Currencies
- [ ] Which 3 currencies? (e.g. EUR, USD, GBP?)
- [ ] Should exchange rates be fixed/manually updated, or fetched live from an API?
- [ ] Are wholesale prices stored per-currency in metafields, or stored in one base currency and converted?

### Collections & Products
- [ ] Will wholesale collections be a subset of existing collections, or will some products be wholesale-only?
- [ ] Should out-of-stock variants be hidden in the size table, shown as disabled, or shown with a "low stock" indicator?
- [ ] Is there a minimum order quantity per line, or a minimum order total?

### Pricing
- [ ] What metafield type for wholesale price and RRP — money, number (cents), or text?
- [ ] Should the RRP column always be visible, or only shown as a comparison reference?

### Cart & Order
- [ ] Should the cart persist across sessions (localStorage) or reset on browser close (sessionStorage)?
- [ ] Is there a concept of a "saved" or "draft" order the buyer can come back to?
- [ ] After submitting the order, should the cart clear automatically?

### Email
- [ ] What email address receives the wholesale orders? (Store default, or a dedicated one?)
- [ ] Does the buyer's auto-reply need custom content beyond Shopify's default contact confirmation?
- [ ] Should the email body include the full order table, or just a summary with the PDF attached?
  - Note: Shopify contact form cannot attach files — PDF would need to be a separate manual step or require a third-party form handler (Formspree, EmailJS) to attach it

### PDF
- [ ] What should the branded PDF look like? (Logo placement, colours, columns, footer)
- [ ] Should the PDF include both currencies or just the selected one?
- [ ] Should it show RRP + wholesale, or wholesale only?

### Access & Security
- [ ] Single shared password, or per-buyer login?
- [ ] Should the password ever expire or rotate?
- [ ] Should there be any logging of who accessed or submitted orders?

### Header / Navigation
- [ ] On the wholesale page, should the standard site header (logo, cart) be hidden entirely, or adapted?
- [ ] Should there be a "return to main site" link visible?
- [ ] Should the wholesale order counter in the header replace the regular cart count, or sit alongside it?

### Design
- [ ] Product card in wholesale context: should it look identical to the store, or have any wholesale-specific badge/indicator (e.g. "wholesale price available")?
- [ ] Should the collections grid show all products in a wholesale-flagged collection, or only products that have a wholesale price metafield set?
