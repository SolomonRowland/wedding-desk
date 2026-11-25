# Tests

These drive the real app in a headless browser (Playwright). Build first, then run any of them with Node.

```
python3 build.py --test
node tests/flows.js            # 34 start-to-finish tasks: add, edit, delete, Excel round trip, calendar, PDFs
node tests/stress.js           # 600-guest plan, damaged saves, six screen sizes
node tests/hostile-text.js     # unsafe text typed into every field (also -2 and -3)
node tests/tap-everything.js example 390   # taps every button; args: example|empty, width, optional screen filter
node tests/sign-in.js          # create account, sign in, wrong password, duplicate email
node tests/sharing.js          # Bride, Groom, coordinator and a viewer on one plan
node tests/who-can-see.js      # the people list and invites in Settings
node tests/offline.js          # open and edit with no connection, then merge when back online
```

The sign-in and sharing tests talk to `fake-supabase.js`, a stand-in for the real database, so they never touch real accounts.
