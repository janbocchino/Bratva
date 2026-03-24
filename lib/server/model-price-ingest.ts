// beginning of LLM written Code, Model: gpt-5.3-codex-low
import { type } from 'arktype';

const ModelPriceInputRow = type({
  assetTicker: 'string.trim |> string.lower',
  priceCents: 'number.integer >= 0',
  timestamp: 'number',
});
const ModelPriceInputBatch = ModelPriceInputRow.array();

export type ModelPriceInputRow = typeof ModelPriceInputRow.infer;

export { ModelPriceInputBatch };

export const toLatestRowByTicker = (rows: readonly ModelPriceInputRow[]) => {
  const latestByTicker = new Map<string, ModelPriceInputRow>();
  for (const row of rows) {
    const previous = latestByTicker.get(row.assetTicker);
    if (previous === undefined || row.timestamp >= previous.timestamp) {
      latestByTicker.set(row.assetTicker, row);
    }
  }
  return latestByTicker;
};
// end of LLM written Code
