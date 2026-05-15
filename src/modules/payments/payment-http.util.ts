import { ErrorCodes } from '../../common/errors/error-codes';
const TRANSIENT_FAILURE_CODES = new Set<string>([
  ErrorCodes.NETWORK_ERROR,
  'NETWORK_TIMEOUT',
  'RATE_LIMIT_EXCEEDED',
  'BANK_HTTP_503',
  'BANK_HTTP_502',
  'ECONNRESET',
  'ETIMEDOUT',
  'RETRY_EXHAUSTED',
]);
export function isTransientTerminalFailure(
  failureCode: string | null | undefined,
): boolean {
  if (!failureCode) {
    return true;
  }
  return TRANSIENT_FAILURE_CODES.has(failureCode);
}
