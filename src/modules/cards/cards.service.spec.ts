import {
  decryptAes256Gcm,
  encryptAes256Gcm,
  sha256KeyMaterial,
} from '../../common/utils/encryption.util';
import { isValidLuhn } from '../../common/utils/luhn.util';
describe('CardsService crypto helpers', () => {
  it('encrypts and decrypts PAN material', () => {
    const key = sha256KeyMaterial('k'.repeat(32));
    const pan = '4111111111111111';
    const enc = encryptAes256Gcm(key, pan);
    expect(decryptAes256Gcm(key, enc)).toBe(pan);
  });
  it('validates Luhn for known test PAN', () => {
    expect(isValidLuhn('5555555555554444')).toBe(true);
  });
});
