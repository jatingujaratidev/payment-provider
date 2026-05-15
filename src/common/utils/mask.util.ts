export function maskCardNumber(pan: string): string {
  const digits = pan.replace(/\D/g, '');
  if (digits.length < 4) {
    return '****';
  }
  return `****${digits.slice(-4)}`;
}
export function redactSensitiveShallow(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const blocked = new Set([
    'password',
    'password_hash',
    'card_number',
    'cardNumber',
    'pan',
    'cvv',
    'cvc',
    'encrypted_card_number',
    'encryption_iv',
    'encryption_tag',
  ]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (blocked.has(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = v;
    }
  }
  return out;
}
