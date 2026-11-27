---
description: Test and ship Lead Desk to Vercel
---
Ship Lead Desk:

1. Run `npm test`, `npm run typecheck` and `npm run build`. If anything fails, stop and show me what broke.
2. If there's a new file in `supabase/migrations/`, remind me to run it in the Supabase SQL editor **before** the code goes live, and wait for my OK.
3. Commit with a short message (use my arguments if I gave any: "$ARGUMENTS") and push the current branch. Merging or pushing to `main` goes live on Vercel. Ask before doing that.
4. Finish with one line: what was pushed and where (preview or live).
