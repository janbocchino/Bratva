<!-- beginning of LLM written Code, Model: GPT-5.2 -->

## Security + cleanup report (Bratva)

### High severity (fix first)
- **Public “secret” API route leaks user data access and is unfinished**
  - **File**: `c:\Pump the Huzz\Bratva\app\api\secret\route.ts`
  - **Issue**: No auth, hardcoded `UserId(1)`, calls `userReadRepo.getUser(...)` and **returns no response** (undefined behavior). This is both a security risk and broken functionality.

```6:13:c:\Pump the Huzz\Bratva\app\api\secret\route.ts
export async function GET(request: Request) {
  const id = UserId(1);

  const userEffect = await userReadRepo
    .getUser({ id })
    .pipe(E.provideService(Db, db))
    .pipe(E.runPromise);
}
```

- **Repo contains `.venv/` content (huge attack surface + potential leakage)**
  - **Evidence**: `git status` shows many `.venv\Lib\site-packages\...` files.
  - **Why it matters**: virtualenvs can carry local metadata, increase supply-chain risk, and should never be in git (even if “just untracked”).

### Medium severity (likely security footguns)
- **“Internal” ingestion route uses spoofable headers to decide “localhost”**
  - **File**: `c:\Pump the Huzz\Bratva\app\api\internal\model-prices\route.ts`
  - **Issue**: Locality check relies on `host`, `x-forwarded-for`, `x-real-ip`. In many deployments those can be forged unless you’re strictly behind a trusted proxy chain.
  - **Impact**: attacker could hit an endpoint you intended as local-only and inject model prices.
  - **Fix direction**: require a shared secret/HMAC header (or mTLS) instead of IP/header checks.

- **FastAPI bridge reflects upstream error bodies back to callers**
  - **File**: `c:\Pump the Huzz\Bratva\backend\api.py`
  - **Issue**: on upstream errors you include upstream payload/body in HTTPException detail. If Next ever returns stack traces or internal details, it gets mirrored to whoever can reach FastAPI.
  - **Fix direction**: return generic error externally; log redacted details privately.

- **FastAPI host binding is env-controlled (easy to accidentally expose)**
  - **File**: `c:\Pump the Huzz\Bratva\backend\constants.py`
  - **Issue**: `BACKEND_FASTAPI_HOST` can be set to `0.0.0.0` and expose `/model-prices` on the LAN/Internet.
  - **Fix direction**: enforce loopback in non-dev or require explicit “expose” flag + auth.

### Low severity (still worth fixing)
- **Worker prints response bodies / error bodies to stdout**
  - **File**: `c:\Pump the Huzz\Bratva\backend\worker.py`
  - **Issue**: printing response bodies and `error_body` can leak internal details into logs.

### “Functionality lacking” / architectural gaps
- **Identity / authorization boundary is unclear for money-moving actions**
  - **Files**:
    - `c:\Pump the Huzz\Bratva\lib\server\actions\add-balance.ts`
    - `c:\Pump the Huzz\Bratva\lib\server\actions\withdraw-balance.ts`
    - `c:\Pump the Huzz\Bratva\lib\server\actions\place-order.ts`
    - `c:\Pump the Huzz\Bratva\lib\server\actions\provide-liquidity.ts`
    - `c:\Pump the Huzz\Bratva\lib\server\actions\withdraw-liquidity.ts`
    - `c:\Pump the Huzz\Bratva\lib\server\actions\cancel-order.ts`
  - **Issue**: these actions take `userId` as input. If any client-side path can call them with arbitrary params, this becomes **account-takeover-by-parameter**.
  - **Fix direction**: derive user identity from a trusted server session (cookies/JWT) and remove `userId` from public action params, or enforce ownership checks everywhere at the boundary.

- **Several server actions appear “unplugged” (implemented but not reachable from UI)**
  - **Likely unused from `app/`**: `placeOrder`, `cancelOrder`, `withdrawBalance`, `provideLiquidityAction`, `withdrawLiquidityAction` (no `app/` references found by search).
  - **Recommendation**: either wire UI/routes to them, or delete/park them to shrink attack/maintenance surface.

### Cleanup / hygiene
- **Docs may be out of sync**
  - **File**: `c:\Pump the Huzz\Bratva\domain\workflows.md` mentions missing write-side/UI wiring, but you now have actions calling `ledgerWriteRepo.createEntry` and UI calling at least `addBalance`.

---

## Prioritized remediation checklist
- **P0**: Remove/lock down `app/api/secret` (delete route or add auth + return safe response; remove hardcoded `UserId(1)`).
- **P0**: Ensure `.venv/` is never in git (and remove from tracking if it ever was).
- **P1**: Replace “localhost header checks” on internal ingest with a shared secret (or mTLS).
- **P1**: Stop reflecting upstream error bodies to external clients in `backend/api.py`.
- **P2**: Make server actions derive `userId` from session/auth context (or prove they’re server-only and not callable by untrusted clients).
- **P2**: Either wire or remove unused server actions; update docs.

<!-- end of LLM written Code -->

