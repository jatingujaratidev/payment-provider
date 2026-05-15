import { isValidLuhn } from './luhn.util';
describe('luhn.util', () => {
  it('accepts valid Visa test PAN', () => {
    expect(isValidLuhn('4111111111111111')).toBe(true);
  });
  it('rejects invalid checksum', () => {
    expect(isValidLuhn('4111111111111112')).toBe(false);
  });
  it('rejects too short input', () => {
    expect(isValidLuhn('123456789012')).toBe(false);
  });
});
