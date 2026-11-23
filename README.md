# The Wedding Desk

A wedding planning app for your phone: tasks, decisions, guests, seating, budget, payments and vendors in one place.

Open it at https://solomonrowland.github.io/wedding-desk/

- **iPhone:** open the link in Safari, tap Share, then Add to Home Screen.
- **Android:** open the link in Chrome, tap the menu, then Install app.

It opens with a fictional example wedding so you can look around. When you're ready, go to Settings and tap Start My Own Wedding, or import The Wedding Desk Excel workbook.

Your plan is saved on your own phone. Nothing is uploaded unless sign-in and sharing are turned on.

## What's in this repo

| Path | What it is |
|---|---|
| `index.html` | The whole app (built from the source, don't edit by hand) |
| `sw.js` | Offline support. The `CACHE` name is bumped on every release |
| `lib/` | jsPDF (PDFs), SheetJS (Excel) and Supabase (optional sign-in) |
| `supabase/setup.sql` | Database setup for sign-in and sharing. Paste into Supabase SQL Editor and run |
| `privacy.html` | Privacy Policy |
| `wedding-desk-template.xlsx` | Blank Excel template the app fills in for Download Excel |
