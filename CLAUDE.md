# Lead Desk

A phone-first web app for calling and messaging Meta (Facebook/Instagram) ad leads. It is built by BBB Integrated. The first client is **Ibna**, a rental apartment. Leads arrive in a Google Sheet. The app shows each lead as a card with Call, WhatsApp and a status dropdown, and writes everything back to the same sheet.

## Stack

- **Google Apps Script web app.** No server and no database: the Google Sheet is the database.
- `src/Code.gs` is the backend. It reads and writes the sheet, and each sheet tab is one client.
- `src/Index.html` is the whole frontend: plain HTML, CSS and vanilla JS in one file, with no build step and no framework. Keep it that way. Apps Script `HtmlService` serves one HTML file.
- **clasp** pushes `src/` to Apps Script. `src/appsscript.json` is the manifest.
- Opened outside Google, Index.html runs in **demo mode** with in-memory sample leads. That's how local preview and the tests work.

## Commands

| Task | Command |
|---|---|
| Install tools | `npm install` |
| Log in to Google (once) | `npm run login` |
| Preview locally (demo data) | `npm run preview` → http://localhost:3000 |
| Run tests | `npm test` (Playwright, demo mode, phone viewport) |
| Push code to Apps Script | `npm run push` |
| Push + update the live web app (same URL) | `npm run deploy` |
| Open the script in the browser | `npm run open` |

`npm run deploy` reads the deployment id from `.deploy.json`. See README.md for first-time setup.

## How the data works

- **One tab = one client.** Tabs starting with `_` are ignored.
- Row 1 is headers. Meta's default headers are auto-detected in `detect()` in Index.html: `full_name`, `phone_number` (Meta adds a `p:` prefix, which gets stripped), `created_time`, `campaign_name`, `city`, and any header containing `furnish`. If a client's form uses other headers, extend the regexes in `detect()`. Don't hard-code columns.
- On first load the app adds these columns at the end: `Status | Notes | Follow Up | Attempts | Last Called | First Called`.
  - `Follow Up` is `YYYY-MM-DD` text, saved as plain text so Sheets doesn't reformat it.
  - `First Called` is an ISO timestamp, used for the "avg time to first call" stat.
  - `Notes` is newest first, one entry per line: `26 Nov, 4:50 pm — text`.
- `updateLead(tab, row, updates, key, val)` re-finds the row by the `id` column if the sheet was sorted in between. Keep that safety check.
- Phone numbers without a country code get `COUNTRY_CODE` (default `91`, India). Use `971` for UAE clients.

## Statuses (single source of truth: `STATUSES` in Index.html)

New · No answer · Follow-up · Interested · Visit booked · Rented · Not interested · Wrong number

- **Not connected** = New + No answer
- **Interested** tile = Interested + Visit booked
- **Closed** (hidden from follow-ups) = Rented, Not interested, Wrong number
- **Reached** (stats) = Follow-up, Interested, Visit booked, Rented, Not interested

If you rename a status, update `STATUSES`, the group arrays (`NOTCONN`, `WARM`, `CLOSED`, `REACHED`), and the demo data.

## Screens (all in Index.html)

1. **Leads:** filter tiles (Today's leads / Not connected / Interested), status chips, search, "Call next", lead cards.
2. **Follow-ups:** grouped Overdue / Today / Tomorrow / This week / Later, with a red badge on the tab.
3. **Stats:** Today / This week / All time; reached %, tiles, status bars, avg time to first call, by campaign.
4. **Lead detail:** a full-screen page with the phone number, Call and WhatsApp, status, follow-up date, city and type tiles, notes, and all form answers.
5. **After-call sheet:** opens automatically when the user returns from the phone dialer (`visibilitychange`). It has the status grid, quick follow-up dates, a note box with a mic, and Save.

## Design rules

The Figma source is "Lead Desk – Mobile App": https://www.figma.com/design/HcegiYQJr1VZgukFksDolI

- Font: **Plus Jakarta Sans** (500/600/700/800).
- Colours: bg `#EDEFF2`, cards `#FFFFFF`, ink `#111114`, muted `#868A94`, soft `#F3F4F6`, **lime `#D7F36B`** = selected/active, pink `#F8DCE5`, lavender `#E4E0FA`, WhatsApp `#1FAF55`. Status colours live in `STATUSES`.
- Phone first: one column, max width 480px, tap targets ≥ 44px, inputs 16px (stops iOS zoom), rounded cards (24px), pill buttons.
- **Keep it simple.** The owner asked for plain, easy-to-understand UI: labelled buttons rather than bare icons, and no extra flows.
- Every user value goes through `esc()` before it enters HTML.

## Gotchas

- `<base target="_top">` must stay. Without it, `tel:` links don't open the dialer from inside the Apps Script iframe.
- Apps Script iframes usually block the microphone. `dictate()` tries Web Speech, then falls back to telling the user to use the keyboard mic.
- Don't use `alert/confirm/prompt`. Use `toast()` and the bottom sheet.
- Changing `Code.gs` or `appsscript.json` needs `npm run deploy`. `push` alone doesn't update what users of the /exec URL see.
- Web app access is "Only myself" (`appsscript.json`). Because it runs as the owner, never switch to `ANYONE` without adding real auth: the link would expose every lead.

## Roadmap

See `docs/roadmap.md`.
