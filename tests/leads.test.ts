import { describe, expect, it } from 'vitest';
import { cleanPhone, fmtPhone, guessFieldMap, label, nice, parseDate, waText, waLink, ago } from '@/lib/leads';

const IBNA = ['id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name', 'form_id', 'form_name',
  'is_organic', 'platform', 'which_type_of_apartment_you_are_looking_for?', 'full_name', 'phone_number', 'city', 'lead_status'];

describe('guessFieldMap', () => {
  it('maps Meta headers from the Ibna sheet', () => {
    expect(guessFieldMap(IBNA)).toEqual({
      name: 'full_name', phone: 'phone_number', time: 'created_time', campaign: 'campaign_name',
      city: 'city', type: 'which_type_of_apartment_you_are_looking_for?',
    });
  });
  it('handles plain headers', () => {
    expect(guessFieldMap(['Name', 'Mobile', 'Date', 'Location'])).toMatchObject({ name: 'Name', phone: 'Mobile', time: 'Date', city: 'Location' });
  });
});

describe('phones', () => {
  it('strips Meta p: prefix and keeps the + country code', () => expect(cleanPhone('p:+918891627549')).toBe('918891627549'));
  it('adds the country code to 10-digit numbers', () => expect(cleanPhone('98460 12345')).toBe('919846012345'));
  it('replaces a leading 0', () => expect(cleanPhone('09846012345')).toBe('919846012345'));
  it('uses the company country code', () => expect(cleanPhone('501234567', '971')).toBe('971501234567'));
  it('rejects junk', () => expect(cleanPhone('p:<test lead: dummy data for phone_number>')).toBe(''));
  it('formats Indian and UAE numbers', () => {
    expect(fmtPhone('918891627549')).toBe('+91 88916 27549');
    expect(fmtPhone('971501234567')).toBe('+971 50 123 4567');
  });
});

describe('WhatsApp', () => {
  const t = 'Hi {name}, thanks for your interest in Ibna apartments. You wanted a {type} apartment in {city}.';
  it('fills the template', () => expect(waText(t, { name: 'Abida Najeeb', type: 'unfurnished', city: 'Calicut' }))
    .toBe('Hi Abida, thanks for your interest in Ibna apartments. You wanted a unfurnished apartment in Calicut.'));
  it('drops " in {city}" when the city is unknown', () => expect(waText(t, { name: 'Joel' })).toBe('Hi Joel, thanks for your interest in Ibna apartments. You wanted a apartment.'));
  it('builds a wa.me link', () => expect(waLink('918891627549', 'Hi & bye')).toBe('https://wa.me/918891627549?text=Hi%20%26%20bye'));
});

describe('text and dates', () => {
  it('labels headers and values', () => {
    expect(label('which_type_of_apartment_you_are_looking_for?')).toBe('Which type of apartment you are looking for?');
    expect(nice('non_furnished')).toBe('Non furnished');
  });
  it('parses Meta timestamps', () => {
    expect(parseDate('2026-10-24T05:56:05-05:00')!.toISOString()).toBe('2026-10-24T10:56:05.000Z');
    expect(parseDate('2026-10-24T05:56:05-0500')!.toISOString()).toBe('2026-10-24T10:56:05.000Z');
    expect(parseDate('nope')).toBeNull();
  });
  it('says how long ago', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    expect(ago('2026-10-24T11:30:00Z', now)).toBe('30m ago');
    expect(ago('2026-10-22T12:00:00Z', now)).toBe('2d ago');
  });
});
