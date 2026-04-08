// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire (crosses function boundary)
How should cost vs proceeds differ?
- [x] cost = mulDivUp(price, qty, SCALE), proceeds = mulDivDown(price, qty, SCALE).
      Buyer pays ceiling, seller receives floor. Dust = cost - proceeds (0 or 1 sub-unit).
      Protocol never loses.
- [ ] Both floor. Buyer underpays, ledger doesn't balance.
*/
import type { QuoteAmount, TokenAmount } from '../values/currencies';
import { SCALE } from '../values/currencies';
import { mulDivDown, mulDivUp, remainder } from '../values/fixed-point';
import type { SettledAmount } from '../values/settlement';

export type TradeSettlementInput = {
  price: QuoteAmount;
  quantity: TokenAmount;
};

export type TradeSettlementResult = {
  cost: SettledAmount<QuoteAmount>;
  proceeds: SettledAmount<QuoteAmount>;
  tokenAmount: TokenAmount;
};

export const settleTradeMatch = (input: TradeSettlementInput): TradeSettlementResult => {
  const price = BigInt(input.price);
  const quantity = BigInt(input.quantity);
  const dust = remainder(price, quantity, SCALE);
  const hasDust = dust > 0n;

  const proceedsAmount = mulDivDown(price, quantity, SCALE) as QuoteAmount;
  const costAmount = (hasDust ? BigInt(proceedsAmount) + 1n : BigInt(proceedsAmount)) as QuoteAmount;

  return {
    cost: { amount: costAmount, dust: hasDust ? 1n : 0n },
    proceeds: { amount: proceedsAmount, dust },
    tokenAmount: input.quantity,
  };
};
// end of LLM written Code
