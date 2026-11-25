# The Wedding Desk

A wedding planning app for phone and computer: tasks, decisions, guests, seating, budget, payments and vendors in one place, shared with your partner and wedding party.

**Open it:** https://solomonrowland.github.io/wedding-desk/

- **iPhone:** open the link in Safari, tap Share, then Add to Home Screen.
- **Android:** open the link in Chrome, tap the menu, then Install app.
- **Computer:** open the link in any browser. Wide screens get a sidebar layout.

Create an account with your name, email and a password. The Bride or Groom starts the wedding, then invites everyone else from Settings with a one-time code. The plan also opens and saves with no connection and syncs when you're back online.

## What's in this repo

| Path | What it is |
|---|---|
| `index.html` | The built app that the site serves. Don't edit by hand; edit `src/` and run the build |
| `src/app.html` | The app's source: all markup, styles and code in one page |
| `src/data.json` | The fictional example wedding |
| `src/legal.py` | Privacy Policy text. Writes `src/legal.json` and `privacy.html` |
| `src/supabase-keys.json` | Supabase project URL and publishable key. Safe to be public; never put a secret key here |
| `build.py` | Builds `index.html` from `src/` |
| `sw.js` | Offline support. Bump `CACHE` on every release |
| `lib/` | jsPDF (PDFs), SheetJS (Excel) and Supabase (sign-in and sharing) |
| `supabase/setup.sql` | Database tables, access rules and functions. Paste into the Supabase SQL Editor and run. Safe to run again |
| `tests/` | Browser tests. See `tests/README.md` |
| `wedding-desk-template.xlsx` | Blank Excel template the app fills in for Download Excel |

## Making a change

```
# edit src/app.html
python3 build.py --test       # writes index.html and a test copy
node tests/flows.js           # plus any other tests that apply
# bump CACHE in sw.js, commit, push to main. GitHub Pages publishes it.
```

## Supabase settings this app expects

- **Authentication, Sign In / Providers, Email:** on, with **Confirm email** off. The app never sends email.
- **Authentication, URL Configuration:** Site URL set to the link above.
- **SQL Editor:** `supabase/setup.sql` has been run.

## If someone forgets their password

The app doesn't send reset emails. In the Supabase SQL Editor, the project owner can set a temporary password, then ask the person to change it in Settings:

```sql
update auth.users
set encrypted_password = extensions.crypt('TemporaryPass123', extensions.gen_salt('bf'))
where email = 'their@email.com';
```

## Later phases

The `stationery-phase` branch holds the paused Stationery shop.
