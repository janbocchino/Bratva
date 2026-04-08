// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { mulDivDown, remainder } from './fixed-point';

export type SettledAmount<T extends bigint = bigint> = {
  readonly amount: T;
  readonly dust: bigint;
};

export const settledMulDiv = (a: bigint, b: bigint, c: bigint): SettledAmount => ({
  amount: mulDivDown(a, b, c),
  dust: remainder(a, b, c),
});
// end of LLM written Code
