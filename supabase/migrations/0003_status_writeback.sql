-- Optional per sheet: write each lead's status back into a column of the company's Google Sheet.
-- NULL = off (the sheet stays read-only).
alter table public.sheet_sources add column if not exists status_column text;

grant update (status_column) on public.sheet_sources to authenticated;
