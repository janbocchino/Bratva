// beginning of LLM written Code, Model: GPT-5.5
/*
Decision questionnaire
- How should model-price refresh enter the Next/Drizzle DB?
  - [x] Operations script invoked by backend/cron infrastructure.
  - [ ] Browser-triggered server action from Explore UI.
*/
import { refreshModelPricesFromFastApi } from '@/lib/server/actions/ingest-model-prices';

const result = await refreshModelPricesFromFastApi();

if (!result.ok) {
  console.error(`Failed to refresh model prices: ${result.error}`);
  process.exit(1);
}

console.log(
  `Model prices refreshed: ${result.receivedRows} received, ${result.appliedAssets} assets, ${result.updatedMarkets} markets.`,
);
// end of LLM written Code
