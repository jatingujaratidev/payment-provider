export function detectCardBrand(panDigits: string): string {
  if (panDigits.startsWith('4')) {
    return 'VISA';
  }
  const firstTwo = parseInt(panDigits.slice(0, 2), 10);
  const firstFour = parseInt(panDigits.slice(0, 4), 10);
  if (firstTwo >= 51 && firstTwo <= 55) {
    return 'MASTERCARD';
  }
  if (firstTwo === 34 || firstTwo === 37) {
    return 'AMEX';
  }
  if (firstFour === 6011 || panDigits.startsWith('65')) {
    return 'DISCOVER';
  }
  return 'UNKNOWN';
}
