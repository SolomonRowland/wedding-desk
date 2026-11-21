# Stationery catalog

The Stationery tab is read-only. Users cannot add or edit items in the app.
Items are added here, in `catalog.json`, and built into the app.

While a category has no items, the app shows 3 empty "coming soon" slots for it.

## Category fields

| Field | Example | Notes |
|---|---|---|
| `id` | `invitations` | Fixed. Items point to this. |
| `name` | `Invitations` | Shown on the category button and section. |
| `for` | `Mail 6 to 8 weeks before the wedding` | One line under the section title. |

## Item fields

| Field | Required | Example | Notes |
|---|---|---|---|
| `id` | yes | `inv-classic-suite` | Letters, numbers and dashes. Never reuse. |
| `category` | yes | `invitations` | One of the category ids. |
| `name` | yes | `Classic Invitation Suite` | |
| `description` | yes | `Invitation, reply card and envelopes.` | One or two short sentences. |
| `price` | yes | `4.75` | Number, US dollars. |
| `unit` | yes | `per set` | `each`, `per set`, `per pack` or `template`. |
| `from` | no | `true` | Shows "from $4.75" when price varies by option. |
| `image` | yes | `shop/img/inv-classic-suite.jpg` | Square photo, about 1200 × 1200 px. |
| `for` | no | `Formal evening weddings` | Shown as "Best for". |
| `options` | no | `[{"name":"Paper","choices":["Cotton","Linen"]}]` | Shown on the item page. Chosen at checkout. |
| `min` | no | `25` | Minimum order quantity. |
| `per` | no | `house` | `guest`, `house` (one per couple or family) or `order`. Used for the cost estimate. |
| `proof` | no | `Within 2 business days` | |
| `delivery` | no | `Ships in 5 to 7 days` | |
| `checkout` | no | `https://buy.stripe.com/...` | Stripe Payment Link. Without it the button reads "Available Soon". Only stripe.com links are accepted. |
| `active` | no | `false` | Hides the item without deleting it. |
| `sort` | no | `1` | Order within its category. |

## Payments

Each item's `checkout` is a Stripe Payment Link. No Stripe keys are stored in the app.
The app adds `client_reference_id=wd_<item id>` to the link so each order shows which item it came from.
Collect names, wedding date and quantity with the Payment Link's custom fields and quantity setting.
