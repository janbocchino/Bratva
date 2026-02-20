`Chain`
- Polygon / Solana --> probs polygon
- look into solidity


`Stripe`
- needs legal entity


`frontend`
- everything


`backend`
- connect ml for asset prices --> python API
- provide liquidity: will it be fixed time based for liquidity?
- Do I need admin view or how are assets created?


`overall`
- Check order table: What is mandatory and what not?
- cleanup/testing
- take out use server/client


Liquidity notes:
Flow:
Asset exists > LP's provide liquidity > Liquidity reaches minimum needed for a market to switch to status open > market switches to status open > placing orders is possible > providing liquidity is still possible > all liquidity is taken out of the market > placing orders is not possible anymore

Constraints:
min liquidity:
liquidity block: 30 days

