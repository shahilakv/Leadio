import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { makeSheets } = await import('@/lib/google/sheets');

describe('Sheets client', () => {
  it('reads the title and tabs', async () => {
    const urls: string[] = [];
    const s = makeSheets(async url => {
      urls.push(url);
      return { properties: { title: 'IBNA LEADS' }, sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }, { properties: { sheetId: 42, title: "Ibna's leads" } }] };
    });
    expect(await s.meta('abc')).toEqual({ title: 'IBNA LEADS', tabs: [{ title: 'Sheet1', gid: 0 }, { title: "Ibna's leads", gid: 42 }] });
    expect(urls[0]).toContain('/spreadsheets/abc?fields=');
  });

  it('quotes tab names (including apostrophes) and returns text cells', async () => {
    let url = '';
    const s = makeSheets(async u => { url = u; return { values: [['id', 'full_name'], ['l:1', 5], ['l:2', null]] }; });
    expect(await s.values('abc', "Ibna's leads", '1:30')).toEqual([['id', 'full_name'], ['l:1', '5'], ['l:2', '']]);
    expect(decodeURIComponent(url)).toContain("/values/'Ibna''s leads'!1:30?valueRenderOption=FORMATTED_VALUE");
  });

  it('handles an empty tab', async () => {
    expect(await makeSheets(async () => ({})).values('abc', 'Sheet1')).toEqual([]);
  });
});
