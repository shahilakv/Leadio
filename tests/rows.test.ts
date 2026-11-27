import { describe, expect, it } from 'vitest';
import { col, parseSheetUrl, rowsToLeads, usableHeaders } from '@/lib/sheets/rows';
import { guessFieldMap } from '@/lib/leads';

const HEAD = ['id', 'created_time', 'ad_id', 'ad_name', 'campaign_name', 'form_name', 'which_type_of_apartment_you_are_looking_for?', 'full_name', 'phone_number', 'city', 'lead_status'];
const SHEET = [
  HEAD,
  ['l:1', '2026-10-24T05:29:48-05:00', '', '', '', 'IBNA OCT 2026', '<test lead: dummy data>', '<test lead: dummy data for full_name>', 'p:<test lead: dummy data for phone_number>', '<test lead>', 'CONNECTED'],
  ['l:2', '2026-10-24T05:56:05-05:00', 'ag:1', 'IBNA BUILDERS', 'IBNA BUILDERS - 14 oct-2026', 'IBNA OCT 2026', 'unfurnished', 'Abida Najeeb', 'p:+918891627549', 'Calicut', 'CREATED'],
  [],
  ['l:3', '2026-10-25T10:00:00-05:00', 'ag:1', 'IBNA BUILDERS', 'IBNA BUILDERS - 14 oct-2026', 'IBNA OCT 2026', 'furnished', 'Joel Mathew', 'p:+919846012345', 'Kochi', 'CREATED'],
  ['l:3', '2026-10-25T10:00:00-05:00', '', '', '', '', 'furnished', 'Joel Mathew (dup)', 'p:+919846012345', 'Kochi', ''],
];

describe('rowsToLeads', () => {
  const map = guessFieldMap(HEAD);
  const leads = rowsToLeads(SHEET, map, ['city', 'which_type_of_apartment_you_are_looking_for?']);

  it('skips the test lead, empty rows and duplicate ids', () => {
    expect(leads.map(l => [l.external_id, l.sheet_row, l.name])).toEqual([['l:2', 3, 'Abida Najeeb'], ['l:3', 5, 'Joel Mathew']]);
  });
  it('cleans the phone and parses the time', () => {
    expect(leads[0].phone).toBe('918891627549');
    expect(leads[0].lead_time).toBe('2026-10-24T10:56:05.000Z');
    expect(leads[0].campaign).toBe('IBNA BUILDERS - 14 oct-2026');
  });
  it('stores only mapped and card fields, never Meta bookkeeping', () => {
    expect(Object.keys(leads[0].fields).sort()).toEqual(['campaign_name', 'city', 'created_time', 'full_name', 'phone_number', 'which_type_of_apartment_you_are_looking_for?'].sort());
  });
  it('uses a stable hash id when the sheet has no id column', () => {
    const noId = SHEET.map(r => r.slice(1));
    const a = rowsToLeads(noId, guessFieldMap(HEAD.slice(1)), []);
    const b = rowsToLeads([noId[0], noId[4], noId[2]], guessFieldMap(HEAD.slice(1)), []);
    expect(a[0].external_id).toMatch(/^h:[0-9a-f]{20}$/);
    expect(b.find(l => l.name === 'Abida Najeeb')!.external_id).toBe(a[0].external_id);
  });
  it('returns nothing for an empty sheet', () => expect(rowsToLeads([], map, [])).toEqual([]));
});

describe('sheet helpers', () => {
  it('column letters', () => expect([col(1), col(26), col(27), col(703)]).toEqual(['A', 'Z', 'AA', 'AAA']));
  it('parses sheet URLs and bare ids', () => {
    const id = '1lRCmiAT2vAigk-QvILXdLI5s_aDNPmLtx_HH96CyxyQ';
    expect(parseSheetUrl(`https://docs.google.com/spreadsheets/d/${id}/edit#gid=123`)).toEqual({ id, gid: '123' });
    expect(parseSheetUrl(id)).toEqual({ id });
    expect(parseSheetUrl('https://example.com/nope')).toBeNull();
  });
  it('hides Meta bookkeeping headers from the picker', () => {
    expect(usableHeaders(HEAD)).toEqual(['id', 'created_time', 'campaign_name', 'which_type_of_apartment_you_are_looking_for?', 'full_name', 'phone_number', 'city']);
  });
});
