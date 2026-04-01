// beginning of LLM written Code, Model: Claude Opus 4.5
/// <reference types="jest" />
import * as Cause from 'effect/Cause';
import {
  InfraError,
  InsufficientBalanceError,
  LiquidityValidationError,
  PortError,
} from '@/domain/errors';
import { mapCauseToUserMessage } from './map-cause-to-user-message';

const GENERIC = 'Something went wrong. Please try again.';

describe('mapCauseToUserMessage', () => {
  it('maps InsufficientBalanceError to user copy', () => {
    const cause = Cause.fail(
      new InsufficientBalanceError({ cause: 'Insufficient balance for withdrawal' }),
    );
    expect(mapCauseToUserMessage(cause)).toBe("You don't have enough balance for this action.");
  });

  it('maps LiquidityValidationError with known cause', () => {
    const cause = Cause.fail(
      new LiquidityValidationError({ cause: 'Deposit ratio must match current pool price' }),
    );
    expect(mapCauseToUserMessage(cause)).toBe('Deposit amounts must match the current pool price.');
  });

  it('unwraps PortError and maps infra to generic', () => {
    const cause = Cause.fail(
      new PortError({ cause: new InfraError({ cause: new Error('db down') }) }),
    );
    expect(mapCauseToUserMessage(cause)).toBe(GENERIC);
  });

  it('returns generic when there is no typed failure', () => {
    const cause = Cause.die(new Error('unexpected defect'));
    expect(mapCauseToUserMessage(cause)).toBe(GENERIC);
  });
});
// end of LLM written Code
