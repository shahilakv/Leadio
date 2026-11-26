# Lead Desk

Call and WhatsApp your Meta ad leads from your phone. Leads come from a Google Sheet, and every status, note and follow-up is saved back to it.

## First-time setup (about 10 minutes)

**You need:** Node.js 18+ and the Google account that owns the leads sheet.

1. **Install**
   ```bash
   npm install
   ```
2. **Turn on the Apps Script API** (once per Google account):
   https://script.google.com/home/usersettings → *Google Apps Script API* → On
3. **Log in to Google**
   ```bash
   npm run login
   ```
4. **Link this project to your sheet's script**
   - Open the leads Google Sheet → *Extensions → Apps Script*.
   - In the Apps Script editor go to *Project Settings* (gear icon) and copy the **Script ID**.
   - Copy `.clasp.json.example` to `.clasp.json` and paste the Script ID in.
5. **Push the code**
   ```bash
   npm run push
   ```
   If clasp asks to overwrite the manifest, say yes.
6. **Create the web app (first time only)**
   - In the Apps Script editor: *Deploy → New deployment → Web app*.
   - Execute as **Me**, access **Only myself**, then Deploy.
   - Copy the **Deployment ID** into `.deploy.json` (copy it from `.deploy.json.example`).
   - Open the web app URL on your phone and use *Add to Home Screen*.
7. **From now on, every change goes live with:**
   ```bash
   npm run deploy
   ```
   The URL stays the same.

## Sheet format

- Each tab is a client (for example, `Ibna`). Tabs starting with `_` are hidden.
- Row 1 holds the headers. Meta's own headers work as they are (`full_name`, `phone_number`, `created_time`, `campaign_name`, `city`, …).
- The app adds `Status, Notes, Follow Up, Attempts, Last Called, First Called` at the end. Don't rename those columns.

## Local preview

```bash
npm run preview
```
This opens the app with sample leads (demo mode). Nothing touches your sheet.

## Tests

```bash
npx playwright install chromium   # once
npm test
```

## Working with Claude Code

Open this folder in Claude Code. `CLAUDE.md` gives Claude the full context. Useful commands:
- `/deploy`: run tests, push and update the live app
- `/add-client <name>`: set up a new client tab and its WhatsApp message
