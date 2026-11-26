---
description: Set up Lead Desk for a new client (tab, form columns, WhatsApp message)
argument-hint: <client name>
---
Add a new client to Lead Desk: $ARGUMENTS

1. Ask me for anything you don't know yet. Ask everything in one go, not one question at a time:
   - what they sell or rent (it goes into the WhatsApp message)
   - the Meta form questions, or a screenshot of row 1 of their sheet tab
   - their country (for `COUNTRY_CODE`)
2. Tell me to name the sheet tab exactly the client's name. The app picks up new tabs on its own.
3. Check `detect()` in `src/Index.html` against their headers. Extend the regexes only if a column (name, phone, city, type, campaign, time) wouldn't be found. Don't break the existing Ibna headers.
4. The WhatsApp text is one `WA_TEXT` today. If this client needs different wording, change it into a per-client map keyed by tab name, with the current text as Ibna's entry, and keep the `{name}`, `{type}`, `{city}` placeholders working.
5. Run `npm test`, then show me the WhatsApp message as it would read for a sample lead. Don't deploy until I say so.
