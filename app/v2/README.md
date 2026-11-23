# v2 frontend

## Decision questionnaire

- How do we ship a new UI without replacing the old one?
  - [x] Real route segment `app/v2/` — old UI stays at `/`, new at `/v2`; revert by deleting `app/v2/` and `components/v2/`.
  - [ ] Route group colliding on `/` (rejected per design guidelines).

- How is admin separated from the user shell?
  - [x] `(main)` route group for user nav; `admin/` sibling with its own layout and `getRequiredAdmin()` guard.
  - [ ] Single layout with conditional nav (rejected — admin must not inherit user header).

- What visual system does v2 use?
  - [x] Scoped `.theme-lumen` dark mint OKLCH tokens + `AppShell` (sidebar / bottom nav).
  - [ ] Global `:root` dark theme (rejected — breaks legacy UI at `/`).

- Where do shadcn semantic tokens live?
  - [x] Global `app/globals.css` — old pages use literal colors and are unaffected.
  - [ ] Scoped wrapper on v2 layout only.

- Where does business logic live?
  - [x] Reuse `lib/server/actions/*` and `lib/client/*` — no duplicate domain logic in components.
  - [ ] New API layer (out of scope).
