import { retryWithBackoff } from './retry.util';
describe('retry.util', () => {
  it('returns on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    await expect(
      retryWithBackoff(fn, () => true, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 5,
        jitterMaxMs: 0,
      }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });
  it('retries then succeeds', async () => {
    let calls = 0;
    await expect(
      retryWithBackoff(
        async () => {
          calls += 1;
          if (calls < 2) {
            throw new Error('retry');
          }
          return 'done';
        },
        () => true,
        { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 5, jitterMaxMs: 0 },
      ),
    ).resolves.toBe('done');
    expect(calls).toBe(2);
  });
  it('invokes onRetry before subsequent attempts', async () => {
    const onRetry = jest.fn();
    let calls = 0;
    await retryWithBackoff(
      async () => {
        calls += 1;
        if (calls < 2) {
          throw new Error('transient');
        }
        return 'ok';
      },
      () => true,
      { maxAttempts: 4, baseDelayMs: 1, maxDelayMs: 5, jitterMaxMs: 0 },
      onRetry,
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
