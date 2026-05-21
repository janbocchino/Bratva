// beginning of LLM written Code, Model: Claude Opus 4.5
import * as Cause from 'effect/Cause';
import * as O from 'effect/Option';
import {
  AddBalanceValidationError,
  AssetNotFoundError,
  AuthenticationRequiredError,
  DisplayNameAlreadyInUseError,
  EmailAlreadyInUseError,
  ForbiddenError,
  IllegalMarketTransitionError,
  InfraError,
  InfraNotFoundError,
  InsufficientBalanceError,
  InvalidSessionError,
  LiquidityProviderTradeError,
  LiquidityLockError,
  LiquidityPositionNotFoundError,
  LiquidityValidationError,
  MarketClosedError,
  MarketNotActiveError,
  MarketNotFoundError,
  OrderNotCancellableError,
  OrderNotFoundError,
  OrderOwnershipError,
  OrderValidationError,
  ParseError,
  PortError,
  PositionOwnershipError,
  PriceSeriesNotFoundError,
  UserNotFoundError,
} from '@/domain/errors';

const GENERIC = 'Something went wrong. Please try again.';

/** Known plain `Error` messages from server action `E.try` / guards — curated user copy. */
const PLAIN_ERROR_TO_USER: Record<string, string> = {
  'Invalid amountDollars': 'Enter a valid dollar amount.',
  'Invalid price': 'Enter a valid price.',
  'Invalid quantity': 'Enter a valid quantity.',
  'Invalid stopLoss': 'Enter a valid stop loss, or leave it blank.',
  'Invalid expiresAt': 'Enter a valid expiry time, or leave it blank.',
  'Invalid email': 'Enter a valid email address.',
  'Invalid displayName': 'Enter a valid display name.',
  'Market price must be > 0': 'Market price is unavailable. Try again later.',
};

const ADD_BALANCE_CAUSE: Record<string, string> = {
  'Amount must be > 0': 'Amount must be greater than zero.',
};

const ORDER_VALIDATION_CAUSE: Record<string, string> = {
  'Price must be > 0': 'Price must be greater than zero.',
  'Quantity must be > 0': 'Quantity must be greater than zero.',
};

const LIQUIDITY_VALIDATION_CAUSE: Record<string, string> = {
  'Base amount must be > 0': 'Amount must be greater than zero.',
  'Quote amount must be > 0': 'Amount must be greater than zero.',
  'Deposit ratio must match current pool price':
    'Deposit amounts must match the current pool price.',
  'Position is not active': 'This liquidity position is not active.',
  'No LP tokens in pool': 'There is no liquidity in this pool.',
};

function unwrapPortChain(err: unknown): unknown {
  let current = err;
  for (let depth = 0; depth < 8; depth++) {
    if (current instanceof PortError) {
      current = current.cause;
      continue;
    }
    if (
      typeof current === 'object' &&
      current !== null &&
      '_tag' in current &&
      (current as { _tag: string })._tag === 'PortError' &&
      'cause' in current
    ) {
      current = (current as PortError).cause;
      continue;
    }
    break;
  }
  return current;
}

function mapPlainError(err: Error): string | null {
  const mapped = PLAIN_ERROR_TO_USER[err.message];
  return mapped ?? null;
}

function mapTaggedToUser(err: unknown): string | null {
  if (err instanceof InfraNotFoundError || err instanceof InfraError) return GENERIC;

  // beginning of LLM written Code, Model: GPT-5.5
  if (err instanceof AuthenticationRequiredError || err instanceof InvalidSessionError) {
    return 'Sign in or create an account to continue.';
  }
  if (err instanceof ForbiddenError) {
    return "You don't have permission to do that.";
  }
  // end of LLM written Code

  if (err instanceof InsufficientBalanceError) {
    return "You don't have enough balance for this action.";
  }
  if (err instanceof EmailAlreadyInUseError) {
    return 'That email is already in use.';
  }
  if (err instanceof DisplayNameAlreadyInUseError) {
    return 'That display name is already in use.';
  }
  if (err instanceof MarketNotFoundError) {
    return 'Market not found.';
  }
  if (err instanceof MarketNotActiveError) {
    return 'This market is not active for trading.';
  }
  if (err instanceof MarketClosedError) {
    return 'This market is closed.';
  }
  // beginning of LLM written Code, Model: GPT-5.5
  if (err instanceof LiquidityProviderTradeError) {
    return "You can't trade this market while you have an active liquidity position.";
  }
  // end of LLM written Code
  if (err instanceof OrderNotFoundError) {
    return 'Order not found.';
  }
  if (err instanceof OrderOwnershipError) {
    return "You can't modify this order.";
  }
  if (err instanceof OrderNotCancellableError) {
    return "This order can't be cancelled in its current state.";
  }
  if (err instanceof PositionOwnershipError) {
    return "You can't modify this liquidity position.";
  }
  if (err instanceof LiquidityPositionNotFoundError) {
    return 'Liquidity position not found.';
  }
  if (err instanceof UserNotFoundError) {
    return 'Account not found.';
  }
  if (err instanceof AssetNotFoundError) {
    return 'Asset not found.';
  }
  if (err instanceof PriceSeriesNotFoundError) {
    return GENERIC;
  }
  if (err instanceof IllegalMarketTransitionError) {
    return GENERIC;
  }
  if (err instanceof AddBalanceValidationError) {
    return ADD_BALANCE_CAUSE[err.cause] ?? 'Invalid amount.';
  }
  if (err instanceof OrderValidationError) {
    return ORDER_VALIDATION_CAUSE[err.cause] ?? 'Invalid order.';
  }
  if (err instanceof LiquidityValidationError) {
    return LIQUIDITY_VALIDATION_CAUSE[err.cause] ?? 'Invalid liquidity parameters.';
  }
  if (err instanceof LiquidityLockError) {
    return 'This liquidity position is still locked.';
  }
  if (err instanceof ParseError) {
    return `Invalid ${err.field}.`;
  }

  return null;
}

function mapFailureToUserMessage(err: unknown): string {
  const unwrapped = unwrapPortChain(err);

  const tagged = mapTaggedToUser(unwrapped);
  if (tagged !== null) return tagged;

  if (unwrapped instanceof Error) {
    const plain = mapPlainError(unwrapped);
    if (plain !== null) return plain;
  }

  return GENERIC;
}

export function mapCauseToUserMessage(cause: Cause.Cause<unknown>): string {
  const failure = Cause.failureOption(cause);
  if (O.isSome(failure)) {
    return mapFailureToUserMessage(failure.value);
  }
  return GENERIC;
}
// end of LLM written Code
