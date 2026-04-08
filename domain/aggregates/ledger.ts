// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { AssetId } from '../values/asset';
import type { TokenAmount, QuoteAmount } from '../values/currencies';
import type { UserId } from '../values/user';

export type LedgerUnits = 'cent' | 'unit' | 'scaled_unit';

export type UserLedger = {
  userId: UserId;
  summary: {
    assetId: AssetId;
    balance: TokenAmount | QuoteAmount;
    units: LedgerUnits;
  }[];
  transactions: {
    assetId: AssetId;
    drCr: 'dr' | 'cr';
    amount: TokenAmount | QuoteAmount;
    units: LedgerUnits;
    createdAt: Date;
  }[];
};
// end of LLM written Code
