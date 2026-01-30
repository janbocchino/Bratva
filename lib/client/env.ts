import { type } from 'arktype';

export const PublicEnv = type({});

export type PublicEnv = typeof PublicEnv.infer;
