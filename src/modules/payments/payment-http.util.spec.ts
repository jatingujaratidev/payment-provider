import { ErrorCodes } from '../../common/errors/error-codes';
import { isTransientTerminalFailure } from './payment-http.util';
describe('payment-http.util', () => {
  it('classifies known transient bank codes', () => {
    expect(isTransientTerminalFailure('NETWORK_TIMEOUT')).toBe(true);
    expect(isTransientTerminalFailure('RATE_LIMIT_EXCEEDED')).toBe(true);
    expect(isTransientTerminalFailure('ECONNRESET')).toBe(true);
    expect(isTransientTerminalFailure(ErrorCodes.NETWORK_ERROR)).toBe(true);
  });
  it('classifies business declines as non-transient', () => {
    expect(isTransientTerminalFailure('INSUFFICIENT_FUNDS')).toBe(false);
    expect(isTransientTerminalFailure('INVALID_CARD')).toBe(false);
  });
});
