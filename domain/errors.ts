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

export class OrderNotFoundError extends Data.TaggedError('OrderNotFoundError')<{
  cause: unknown;
}> {}

export class LiquidityValidationError extends Data.TaggedError('LiquidityValidationError')<{
  cause: string;
}> {}

export class MarketClosedError extends Data.TaggedError('MarketClosedError')<{
  marketId: number;
}> {}
