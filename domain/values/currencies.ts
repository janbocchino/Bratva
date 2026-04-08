// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire (crosses folder boundary -- see plan)
What decimal precision should financial quantities use?
- [x] 18 decimals (10^18 scale) for ALL quantities (tokens, USD, LP tokens). Matches
      Ethereum/ERC-20 standard. Uniform scale eliminates asymmetric rounding errors in
      two-sided pool computations (sqrt, LP ratio, settlement).
- [ ] 18 for tokens only, 2 for USD (mixed scale). Simpler migration but creates
      asymmetric rounding and ugly initial LP sqrt.
- [ ] 8 decimals (Bitcoin-style)
*/
import { Brand } from 'effect';

export const DECIMALS = 18;
export const SCALE = 10n ** 18n;

export type TokenAmount = Brand.Branded<bigint, 'TokenAmount'>;
export const TokenAmount = {
  new: Brand.nominal<TokenAmount>(),
  fromWhole: (n: bigint): TokenAmount => TokenAmount.new(n * SCALE),
  zero: Brand.nominal<TokenAmount>()(0n),
};

export type QuoteAmount = Brand.Branded<bigint, 'QuoteAmount'>;
export const QuoteAmount = {
  new: Brand.nominal<QuoteAmount>(),
  fromWhole: (n: bigint): QuoteAmount => QuoteAmount.new(n * SCALE),
  zero: Brand.nominal<QuoteAmount>()(0n),
};

export type LpTokens = Brand.Branded<bigint, 'LpTokens'>;
export const LpTokens = {
  new: Brand.nominal<LpTokens>(),
  fromWhole: (n: bigint): LpTokens => LpTokens.new(n * SCALE),
  zero: Brand.nominal<LpTokens>()(0n),
};
// end of LLM written Code
