import { Data } from 'effect';

export class PortError extends Data.TaggedError('PortError')<{
  cause: unknown;
}> {}

export class MappingError extends Data.TaggedError('MappingError')<{
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

export class CreateUserAccountValidationError extends Data.TaggedError(
  'CreateUserAccountValidationError',
)<{
  cause: string;
}> {}

export class AddBalanceValidationError extends Data.TaggedError('AddBalanceValidationError')<{
  cause: string;
}> {}

// ── Exchange Errors ──────────────────────────────────────────────────

export class InsufficientBalanceError extends Data.TaggedError('InsufficientBalanceError')<{
  cause: string;
}> {}

export class OrderNotFoundError extends Data.TaggedError('OrderNotFoundError')<{
  cause: string;
}> {}

export class InvalidOrderError extends Data.TaggedError('InvalidOrderError')<{
  cause: string;
}> {}

export class SelfTradeError extends Data.TaggedError('SelfTradeError')<{
  cause: string;
}> {}

export class InsufficientLiquidityError extends Data.TaggedError('InsufficientLiquidityError')<{
  cause: string;
}> {}

export type ExchangeError =
  | InsufficientBalanceError
  | OrderNotFoundError
  | InvalidOrderError
  | SelfTradeError
  | InsufficientLiquidityError;
