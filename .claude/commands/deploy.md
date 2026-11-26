---
description: Test, push and update the live Lead Desk web app
---
Deploy Lead Desk:

1. Run `npm test`. If any test fails, stop and show me what broke. Don't deploy.
2. Run `npm run deploy -- "$ARGUMENTS"`. Use my arguments as the version description, or a short summary of what changed if I gave none.
3. If it fails because `.clasp.json` or `.deploy.json` is missing, walk me through the matching README step instead of guessing IDs.
4. Finish with one line: what went live. The URL stays the same.
