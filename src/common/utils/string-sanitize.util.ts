export function sanitizeString(value: string): string {
  const trimmed = value.trim();
  return trimmed.split('\u0000').join('');
}
