---
description: Help a new company get set up in Lead Desk
argument-hint: <company name>
---
Help onboard a company to Lead Desk: $ARGUMENTS

Companies sign up themselves now (v3). Help me check that their sheet will work:

1. Ask me for a screenshot or the header row of their sheet, and their country.
2. Check `guessFieldMap()` in `lib/leads.ts` against the headers. Name and phone must be found. Only extend the regexes if needed, and keep the Ibna/Meta headers working. Add a test case in `tests/leads.test.ts`.
3. Suggest a WhatsApp message template for them, using `{name}`, `{type}` and `{city}`. They paste it in Settings.
4. Run `npm test`. Don't commit or push until I say so.
