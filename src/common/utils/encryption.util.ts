import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'crypto';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;
export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
}
export function deriveAes256Key(secret: string): Buffer {
  const buf = Buffer.from(secret, 'utf8');
  if (buf.length >= KEY_LENGTH) {
    return buf.subarray(0, KEY_LENGTH);
  }
  return scryptSync(secret, 'payment-provider-salt', KEY_LENGTH);
}
export function sha256KeyMaterial(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}
export function encryptAes256Gcm(
  key: Buffer,
  plaintext: string,
): EncryptedPayload {
  if (key.length !== KEY_LENGTH) {
    throw new Error('Encryption key must be 32 bytes');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}
export function decryptAes256Gcm(
  key: Buffer,
  payload: EncryptedPayload,
): string {
  if (key.length !== KEY_LENGTH) {
    throw new Error('Encryption key must be 32 bytes');
  }
  const iv = Buffer.from(payload.iv, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const ciphertext = Buffer.from(payload.ciphertext, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
