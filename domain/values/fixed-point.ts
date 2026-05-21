// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
How should mulDivUp handle zero denominators?
- [x] Precondition: c must be > 0n. If violated, bigint throws natively (division by zero).
      No wrapping -- fail loud per AGENTS.md.
- [ ] Return tagged error. Overkill for a pure math primitive.
*/

export const mulDivDown = (a: bigint, b: bigint, c: bigint): bigint => (a * b) / c;

export const mulDivUp = (a: bigint, b: bigint, c: bigint): bigint => {
  const product = a * b;
  return product % c === 0n ? product / c : product / c + 1n;
};

export const divDown = (a: bigint, b: bigint): bigint => a / b;

export const divUp = (a: bigint, b: bigint): bigint => (a % b === 0n ? a / b : a / b + 1n);

export const remainder = (a: bigint, b: bigint, c: bigint): bigint => (a * b) % c;
// end of LLM written Code
