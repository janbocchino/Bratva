`Chain`
- Polygon / Solana --> probs polygon
    - look into solidity
- metamask
- walletconnect
- coingecko


`Stripe`
- needs legal entity


`frontend`
- charts improvement
- design
- Liquidity providing should not be shown as withdraw
- different views for admin and user


`overall`
- cleanup/testing
- take out use server/client
- pull USD value from coingecko
- user accounting
    - Practical checklist before production:
    - Set AUTH_SESSION_SECRET (e.g. 32+ random bytes) in production.
    - Add real authentication (password, magic link, OAuth, etc.).
    - Expose sign-out using clearSessionUser().
    - Keep admin checks in server layout/actions (as you do now); treat middleware as redirect-only.
    - Optionally shorten session TTL and add session tests.
- (Possibly) When migrating to order book pricing, allow users to attach comments to trades.
    - Display these comments on the graph at relevant points.
    - Enable sharing these annotated graphs as part of the whole experience.
- Can you migrate all state to zustand
- Max Networth pulling


`later release:`
- token to token in exchange (multi route trading)
- footbal players