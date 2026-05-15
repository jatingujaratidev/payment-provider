import { MockBankService, BankTransportError } from './mock-bank.service';
describe('MockBankService', () => {
  const service = new MockBankService();
  beforeEach(() => {
    jest.spyOn(global, 'setTimeout').mockImplementation(((
      fn: (...args: unknown[]) => void,
    ) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('distribution converges over many iterations', async () => {
    let successes = 0;
    const iterations = 300;
    for (let i = 0; i < iterations; i += 1) {
      try {
        const res = await service.authorizePayment({
          amount: '1.00',
          currency: 'USD',
          cardToken: 'tok',
        });
        if (res.success) {
          successes += 1;
        }
      } catch (e) {
        if (!(e instanceof BankTransportError)) {
          throw e;
        }
      }
    }
    expect(successes).toBeGreaterThan(200);
  });
});
