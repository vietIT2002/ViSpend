# UI audit harness

Serves the real frontend against an in-memory mock API so every screen can be audited and checked at phone width.

## Run

From `frontend/`, in separate terminals:

```
npm run audit:mock     # mock API on 127.0.0.1:5181
npm run audit:serve    # dev server on http://localhost:5179 (proxies /api to the mock)
MSYS_NO_PATHCONV=1 node tools/ui-audit/mobile-check.mjs <outDir> /transactions /accounts
```

Use `http://localhost:5179` (not `127.0.0.1`): Vite may listen on IPv6 only. The `MSYS_NO_PATHCONV=1` prefix is for Git Bash, which would otherwise turn `/transactions` into a Windows path.

The mobile check emulates 390x844, prints `viewport 390px  scrollWidth N  ok|OVERFLOW` per path and saves a screenshot per path in `<outDir>`. Set `CHROME_PATH` if Chrome is not at `C:/Program Files/Google/Chrome/Application/chrome.exe`.

## Options

- `?notoken` on any URL skips the seeded fake login token, so you see the logged-out state.
- `AUDIT_LANG=en|vi` (default `vi`) sets the UI language the page starts in, e.g. `AUDIT_LANG=en npm run audit:serve`.
- `AUDIT_PORT` and `MOCK_PORT` override ports 5179 and 5181.

## Mock data

The mock is in-memory: edits last until it is restarted, and a restart resets all fixtures. Fixtures cover Oct-Nov 2026 transactions (two editable ones from the last 24 h), a 60-character category name, and accounts including an archived one, one with a 12.450.000.000 balance, and one that cannot be deleted (409 `account_in_use`).

With `?notoken` you can sign in on the login page: any username with the password `demo1234` works. Requests the mock does not know are logged as `UNHANDLED <METHOD> <path>` in the `audit:mock` terminal and answered with 404.
