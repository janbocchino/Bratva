import { Data } from 'effect';

export class PortError extends Data.TaggedError('PortError')<{
  cause: unknown
}> {}

export class InfraNotFoundError extends Data.TaggedError('InfraNotFoundError')<{
  cause: unknown
}> {}

export class InfraError extends Data.TaggedError('InfraError')<{
  cause: unknown
}> {}

export class UserNotFoundError extends Data.TaggedError('UserNotFoundError')<{
  cause: unknown
}> {}