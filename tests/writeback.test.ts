import { describe, expect, it } from 'vitest';
import { statusCells } from '@/lib/sheets/rows';
import { fmtValue } from '@/lib/leads';

const SHEET = [
  ['id', 'created_time', 'full_name', 'phone_number', 'lead_status', 'Lead Desk Status'],
  ['l:3', '2026-10-25T10:00:00-05:00', 'Joel Mathew', 'p:+919846012345', 'CREATED', ''],   // row 2 (sheet was sorted)
  ['l:2', '2026-10-24T05:56:05-05:00', 'Abida Najeeb', 'p:+918891627549', 'CREATED', ''],  // row 3
];

describe('statusCells', () => {
  it('finds rows by Meta id even after sorting', () => {
    const m = statusCells(SHEET, 'Lead Desk Status', [
      { external_id: 'l:2', sheet_row: 2, name: 'Abida Najeeb' },
      { external_id: 'l:3', sheet_row: 3, name: 'Joel Mathew' },
    ], 'full_name');
    expect(Object.fromEntries(m)).toEqual({ 'l:2': 'F3', 'l:3': 'F2' });
  });
  it('can write into an existing column such as lead_status', () => {
    expect(statusCells(SHEET, 'lead_status', [{ external_id: 'l:3', sheet_row: null, name: '' }])).toEqual(new Map([['l:3', 'E2']]));
  });
  it('uses the remembered row for id-less leads only when the name still matches', () => {
    const leads = [{ external_id: 'h:abc', sheet_row: 3, name: 'Abida Najeeb' }, { external_id: 'h:def', sheet_row: 2, name: 'Someone Else' }];
    expect(Object.fromEntries(statusCells(SHEET, 'Lead Desk Status', leads, 'full_name'))).toEqual({ 'h:abc': 'F3' });
  });
  it('returns nothing when the status column is missing', () => {
    expect(statusCells(SHEET, 'Nope', [{ external_id: 'l:2', sheet_row: 3, name: 'Abida Najeeb' }]).size).toBe(0);
  });
});

describe('fmtValue', () => {
  it('makes sheet timestamps readable', () => {
    expect(fmtValue('2026-10-24T05:56:05-05:00')).toMatch(/24 Oct/);
    expect(fmtValue('2026-10-24T05:56:05-05:00')).not.toContain('T05');
    expect(fmtValue('2026-11-30')).toMatch(/30 Nov 2026/);
  });
  it('keeps other values readable', () => {
    expect(fmtValue('non_furnished')).toBe('Non furnished');
    expect(fmtValue('Calicut')).toBe('Calicut');
    expect(fmtValue('2026 budget')).toBe('2026 budget');
  });
});
