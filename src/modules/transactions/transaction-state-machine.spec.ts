import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionStateMachine } from './transaction-state-machine';
import { TransactionStatus } from './transaction-status.enum';
describe('TransactionStateMachine', () => {
  const events = new EventEmitter2();
  const sm = new TransactionStateMachine(events);
  it('allows INITIATED -> PROCESSING', () => {
    expect(() =>
      sm.assertTransition(
        TransactionStatus.INITIATED,
        TransactionStatus.PROCESSING,
      ),
    ).not.toThrow();
  });
  it('rejects INITIATED -> CAPTURED', () => {
    expect(() =>
      sm.assertTransition(
        TransactionStatus.INITIATED,
        TransactionStatus.CAPTURED,
      ),
    ).toThrow();
  });
  it('allows RETRYING -> FAILED', () => {
    expect(() =>
      sm.assertTransition(TransactionStatus.RETRYING, TransactionStatus.FAILED),
    ).not.toThrow();
  });
});
