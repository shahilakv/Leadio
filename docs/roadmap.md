# Roadmap

## v1 — done
- Google Sheet connection (one tab per client), Meta headers auto-detected
- Lead cards: name, date/time, phone, city, furnished type, status dropdown, Call, WhatsApp
- Filter tiles: Today's leads / Not connected / Interested; status chips; search; "Call next"
- After-call popup (status, follow-up date, note), lead detail page, Follow-ups tab, Stats tab
- WhatsApp with a prefilled message

## v2 — next
- **Log WhatsApp contacts.** Count WhatsApp taps the same way as calls, so leads who are only messaged still show as contacted.
- **Real voice notes.** Record audio, transcribe it (Malayalam + English) and turn it into a short summary plus a suggested status and follow-up date. This needs hosting outside the Apps Script iframe, because Apps Script blocks the mic.
- **New lead alert.** Send a push or WhatsApp ping within a minute of a lead arriving. Speed-to-lead is the biggest lever on conversion.
- **Team use.** Let Shahila or a client's sales team log in, assign leads, and see who called. Real login is needed before switching web app access away from "Only myself".

## v3 — product
- Pull leads straight from the Meta Lead Ads API, so there's no sheet step in between.
- Read-only client view, so the client sees their own leads and outcomes as a paid reporting add-on.
- Send conversions back to Meta (Conversions API for CRM), so ads learn which leads actually rent or buy.
