import { fromIsoDate, toIsoDate } from './iso-date';

describe('ISO dates', () => {
  it('round-trips a calendar day without shifting it across timezones', () => {
    const date = fromIsoDate('2020-01-15');

    expect(date.getFullYear()).toBe(2020);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(15);
    expect(toIsoDate(date)).toBe('2020-01-15');
  });
});
