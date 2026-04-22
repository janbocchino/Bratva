- Mark every LLM-written code with the following wrapper:

```
// beginning of LLM written Code, Model: <Model>
// ... code ...
// end of LLM written Code
```

- Always reuse functions and be aware of overall project structure
- Don't write duplicate code
- Use best possible implementations; if there is a library (e.g. effect) to enhance code and make it shorter, ask for permission to use
- Use "bun test" for testing with Jest
- Use "bun fmt" for biome lint


# AGENTS.md

This document describes the **aesthetic and architectural philosophy** of this codebase. When
contributing — in any language, framework, or problem domain — internalize these principles and let
them guide your decisions.

---

## Core Philosophy

### Solution Space Minimalism

When you're implementing a program or a subset of a program:

- Consider the problem by *articulating one specific formulation of it*.
- If there are multiple formulations, choose one that is sensible or if in doubt, ask for
clarification.
- Once you have a formulation, consider the solution space. It should be **NARROW AS FUCK**. Enforce
narrowness through the type system, programming interface, and exceptions in that order of
preference.

Ideally, I should not be able to construct an invalid state using the code you give me. A concrete
example of failing to identify a specific formulation of a problem: when you write a
`_encode_feature` function that handles 3 different ways of passing in the input tensor because
"it's flexible" or "conventions blah blah blah". You're not drafting a peace treaty in the middle
east here. Pick a fucking side.

### Intervention Size

Ask yourself whether the intervention you are making in the codebase is appropriate.

If you find youself crossing the boundaries of a single function, add a "decision questionnaire" to
the documentation of any other function explicitly outlining key decisions you made to navigate the
solution space. This should take of the form of a list of questions, the answer you picked and a
short form rationale.

```markdown
What state management library should I use?

- [x] Jotai — We don't need top down state control but we also need something more than
      component-specific store to avoid prop drilling.
- [ ] Zustand
- [ ] Native React
```

If crossing file boundaries, add a "decision questionnaire" to the top of the file.

If crossing folder boundaries, add a "decision questionnaire" to a README.md file in the module
folder.

### Failures are values, not surprises

Any operation that can fail must make that failure visible in its return type, not hidden behind an
exception. This applies whether you're querying a database, calling an API, parsing user input, or
loading a model checkpoint. The failure surface should be readable from a function's signature alone
— callers should never be surprised by what can go wrong.

Error handling is not defensive boilerplate. It is part of the design. If I see garbage like this,
my cofounder will personally run over the H100 your ass is running on with an F150.

```python
if not (node_input := x["node_input"]).shape == (n, d_n):
  raise ValueError(f"node_input must be a tensor of shape (n, d_n), but got {node_input.shape}")
```

### Types as guarantees, not documentation

The type system is used to make illegal states unrepresentable. If two things are both strings (or
both floats, or both tensors) but mean fundamentally different things, they should have different
types. This is the primary mechanism by which the codebase communicates intent and prevents entire
classes of bugs that would otherwise only surface at runtime.

If a concept has meaningful identity, it should have a meaningful type. Primitive obsession is an
anti-pattern. You are an ATS programmer who has to unfortunately condescend to the language of the
deplorable proles.

### Errors are first-class citizens

Errors are not strings. They are named, structured values that carry context: what went wrong,
where, and why. Each layer of the system has its own family of error types, and errors are
translated explicitly as they cross layer boundaries. A low-level failure (e.g., a corrupted file, a
failed network call, a NaN in a tensor) should surface upstream with enough context to be
actionable, not as a raw traceback or a silent wrong answer.

When you introduce a new failure mode, give it a name.

### Dependencies are explicit, not ambient

Functions receive what they need; they do not reach into global state or hidden singletons to find
it. Configuration, external clients, database connections, random seeds — these are injected, not
grabbed. This is not about purity for its own sake. It is about making a function's true inputs
visible, which makes it testable, composable, and honest.

---

## Architectural Layers

Concerns are separated into distinct layers, and the boundaries between them are respected:

**Domain / Core** — Pure logic, types, and contracts. No I/O, no framework dependencies. This is
where the real thinking lives, and it should be expressible without knowing anything about the
outside world.

**Infrastructure** — Implementations that touch the outside world: filesystems, databases, APIs,
hardware. Failures here are translated into domain-level errors before propagating upward. Raw
implementation details do not leak through.

**Orchestration / Entry points** — Thin coordination: parse the input, run the pipeline, render the
output. This layer trusts the domain to have done the hard thinking and does not contain business or
scientific logic itself.

Do not let infrastructure details leak into core logic. Do not let core logic be expressed in
infrastructure code.

---

## Style Sensibility

### Declare intent with pipelines, not imperative steps

Logic should read as a chain of transformations — take this, reshape it, validate it, produce that.
This declarative style reveals the *what* and makes the shape of the computation visible. Avoid
writing a sequence of imperative steps that mutate intermediate variables; this buries the *what* in
the *how* and introduces incidental complexity.

### Construct in one pass, not two

Data structures should be created in a single, complete operation, not initialized and then mutated.
Avoid patterns where you pre-allocate a container, fill it with placeholder data, and then overwrite
it in a second pass. This two-pass initialization introduces temporal coupling, forcing the reader
to track the history of a variable to understand its final state.

### Small, composable units

Functions and modules do one thing. Larger behaviors are assembled by composing smaller ones. If
something is doing too much, it should be split. Prefer many small, focused modules over a single
file or class that has grown to know everything.

### Names are precise, not clever

Names are matter-of-fact, role-revealing, and deliberately unexciting. There is no wordplay, no
unexplained abbreviation, no ambiguity about what something does based on its name alone. A longer,
obvious name is almost always better than a short, mysterious one.

### Parse, don't validate

Input from the outside world — user input, config files, network responses, raw data files — is
parsed and validated against a schema at the entry point. Once past the boundary, data is trusted as
the correct type and shape. Do not scatter validation logic throughout the interior of the system;
validate once, loudly, at the edge.

### Immutability by default

Treat data structures as immutable. If state must be maintained (e.g., a training loop state, a user
session), encapsulate it within a strict state machine or a singular, predictable state container.

---

## What to Avoid

- **Exceptions as normal control flow.** Reserve them for truly unexpected, unrecoverable
situations.
- **Stringly typed or weakly typed domain concepts.** If it has a name and a meaning, it should have
a type.
- **God objects and monolithic modules.** If something knows too much, it should be split.
- **Leaking layer concerns.** Core logic should not import infrastructure. Entry points should not
contain core logic.
- **Silent failures.** A wrong answer delivered confidently is worse than an explicit error. Failing
loudly is a feature.
- **Implicit global state.** If a function's behavior depends on something that isn't in its
arguments, that dependency should be made visible.
- **Temporal coupling and two-pass initialization.** Don't write code that relies on an implicit
sequence of calls to be correct. Construct objects in a single, valid state.

---

The spirit of this codebase is: **make failures explicit, make dependencies visible, make illegal
states unrepresentable, and express logic as a typed pipeline of transformations.** Let the
structure of the code tell the truth about what it does.