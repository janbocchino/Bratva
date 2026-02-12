Implementation Plan: Deterministic Hybrid Exchange (Order Book + AMM)
1. Core Architecture Philosophy
The exchange is implemented as a deterministic state machine.
Formula: $State_{n+1} = Transition(State_n, Event_n)$
Determinism: Given the same initial state and the same sequence of events, the resulting state must be identical.
Hybrid Matching: The engine treats the AMM as a "Virtual Liquidity Provider" that exists alongside the Limit Order Book (LOB).

2. Component Breakdown (The "Crazy Design" Simplified)
A. The Sequencer (The Single Source of Truth)
Role: Acts as the entry point for all user actions (Orders, AMM Swaps, Cancellations).
Function: Assigns a monotonic SequenceNumber and a Timestamp to every incoming request.
Output: An ordered "Command Log" that the State Machine consumes.
B. The State Machine (The Matching Engine)
This is a pure logic layer with no I/O, containing:
Order Book: Bids and Asks sorted by Price-Time priority.
AMM Pool: Current reserves ($x, y$) and the constant product invariant ($k$).
Ledger: Internal tracking of user "Escrowed" balances (locked for open orders/liquidity).
C. The Gateways (Ports)
Role: Handle networking (WebSockets/REST).
Pre-Trade Risk: Validates that a user has sufficient balance before sending the event to the Sequencer.
Post-Trade Reporting: Listens to the State Machine's output to notify users of fills.

3. The State Transition Logic
Event Types
PlaceLimitOrder: Adds an entry to the LOB.
CancelOrder: Removes an entry from the LOB.
SwapAMM: Executes a trade directly against the AMM reserves.
ProvideLiquidity: Updates AMM reserves and mints LP tokens.
Hybrid Matching Algorithm
When a MarketOrder or CrossableLimitOrder arrives:
Price Comparison: Compare the BestPrice on the LOB vs. the EffectivePrice of the AMM (considering slippage for the requested size).
Execution:
If LOB_Price is better: Fill against the LOB.
If AMM_Price is better: Fill against the AMM.
Partial Fills: If one source is exhausted, the remaining volume "spills over" to the next best price source (LOB or AMM).
Settlement: Atomically update the internal Ledger and AMM reserves.

4. Implementation Phases
Phase 1: Pure Logic (The "State" and "Transition")
Define the ExchangeState data structure.
Implement process_event(state, event) -> (new_state, matches).
Ensure the AMM logic handles rounding errors conservatively (always in favor of the exchange).
Phase 2: The Sequencer & Event Log
Implement a wrapper that receives inputs and pushes them into an append-only queue.
Implement "Snapshotting": Periodically save the ExchangeState to disk so the log can be truncated.
Phase 3: The "Fairy" Processes (Background Logic)
The Cancel Fairy: A logic block that checks the Timestamp of the latest event and automatically generates CancelOrder events for expired orders.
The Trade Reporter: A service that consumes the "Matches" output and formats them for the external TRF (Trade Reporting Facility).
Phase 4: Integration & Edge Cases
Handle "Self-Trade Prevention."
Implement "Minimum Tick Size" and "Minimum Order Quantity" logic.
Ensure the AMM $k$ value is maintained after every swap.

5. Definition of Done
The system can be replayed from an Event Log to produce the exact same balances and order book state.
A trade can be partially filled by a Limit Order and partially by the AMM in a single atomic transaction.
The "Escrow Ledger" never allows a user to spend more than they have deposited.

