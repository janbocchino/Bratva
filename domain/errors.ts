import { Data } from 'effect';

export class PortError extends Data.TaggedError('PortError')<{
  cause: unknown;
}> {}

export class InfraNotFoundError extends Data.TaggedError('InfraNotFoundError')<{
  cause: unknown;
}> {}

export class InfraError extends Data.TaggedError('InfraError')<{
  cause: unknown;
}> {}

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  cause: unknown;
}> {}

// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- How should auth failures cross server boundaries?
  - [x] Named domain errors mapped to safe user messages.
  - [ ] Raw thrown strings from auth helpers.
*/
export class AuthenticationRequiredError extends Data.TaggedError('AuthenticationRequiredError')<{
  cause: string;
}> {}

export class ForbiddenError extends Data.TaggedError('ForbiddenError')<{
  requiredRole: string;
}> {}

export class InvalidSessionError extends Data.TaggedError('InvalidSessionError')<{
  cause: string;
}> {}
// end of LLM written Code

export class AssetNotFoundError extends Data.TaggedError('AssetNotFoundError')<{
  cause: unknown;
}> {}

export class PriceSeriesNotFoundError extends Data.TaggedError('PriceSeriesNotFoundError')<{
  cause: unknown;
}> {}

export class EmailAlreadyInUseError extends Data.TaggedError('EmailAlreadyInUseError')<{
  email: string;
}> {}

export class DisplayNameAlreadyInUseError extends Data.TaggedError('DisplayNameAlreadyInUseError')<{
  displayName: string;
}> {}

export class AddBalanceValidationError extends Data.TaggedError('AddBalanceValidationError')<{
  cause: string;
}> {}

export class InsufficientBalanceError extends Data.TaggedError('InsufficientBalanceError')<{
  cause: string;
}> {}

export class MarketNotFoundError extends Data.TaggedError('MarketNotFoundError')<{
  cause: unknown;
}> {}

export class MarketNotActiveError extends Data.TaggedError('MarketNotActiveError')<{
  marketId: number;
}> {}

export class OrderValidationError extends Data.TaggedError('OrderValidationError')<{
  cause: string;
}> {}

// beginning of LLM written Code, Model: GPT-5.5
export class LiquidityProviderTradeError extends Data.TaggedError('LiquidityProviderTradeError')<{
  marketId: number;
  userId: number;
}> {}
// end of LLM written Code

export class OrderNotFoundError extends Data.TaggedError('OrderNotFoundError')<{
  cause: unknown;
}> {}

export class LiquidityValidationError extends Data.TaggedError('LiquidityValidationError')<{
  cause: string;
}> {}

export class MarketClosedError extends Data.TaggedError('MarketClosedError')<{
  marketId: number;
}> {}

// beginning of LLM written Code, Model: Claude
export class IllegalMarketTransitionError extends Data.TaggedError('IllegalMarketTransitionError')<{
  status: string;
  event: string;
}> {}
// end of LLM written Code

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export class LiquidityLockError extends Data.TaggedError('LiquidityLockError')<{
  cause: string;
}> {}

export class LiquidityPositionNotFoundError extends Data.TaggedError(
  'LiquidityPositionNotFoundError',
)<{
  cause: unknown;
}> {}
// end of LLM written Code

// beginning of LLM written Code, Model: Gemini
export class OrderOwnershipError extends Data.TaggedError('OrderOwnershipError')<{
  orderId: number;
  userId: number;
}> {}

export class OrderNotCancellableError extends Data.TaggedError('OrderNotCancellableError')<{
  orderId: number;
  status: string;
}> {}

export class PositionOwnershipError extends Data.TaggedError('PositionOwnershipError')<{
  positionId: number;
  userId: number;
}> {}

export class ParseError extends Data.TaggedError('ParseError')<{
  field: string;
  input: unknown;
}> {}
// end of LLM written Code

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export class DustOverflowError extends Data.TaggedError('DustOverflowError')<{
  operation: string;
  dust: bigint;
  threshold: bigint;
}> {}

export class FixedPointParseError extends Data.TaggedError('FixedPointParseError')<{
  input: string;
  reason: string;
}> {}
// end of LLM written Code
