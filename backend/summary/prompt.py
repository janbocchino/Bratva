# beginning of LLM written Code, Model: GPT-5.2
from __future__ import annotations


def build_prompt(
    *,
    asset_ticker: str,
    model_price_usd: str,
    new_feature_snapshot_json: str,
    old_feature_snapshot_json: str | None,
) -> str:
    has_prior = old_feature_snapshot_json is not None
    prior_block = "" if old_feature_snapshot_json is None else f"\nPRIOR_CONTEXT:\n{old_feature_snapshot_json}\n"

    return (
        "You are a senior analyst writing an 'Analyst summary' for a person-token.\n"
        "Hard rules:\n"
        "- Output MUST be 2–3 sentences total.\n"
        "- Be explicit this is a model-derived valuation (not a trade price).\n"
        "- Do NOT invent facts. Only use information present in the provided context.\n"
        "- Never mention internal mechanics or schema words: feature, features, field, fields, input, inputs, snapshot, snapshots, json.\n"
        "- Avoid generic filler (e.g., 'mixed signals', 'various factors').\n"
        "\n"
        "What to say:\n"
        "- Sentence 1: State the subject name and model-derived price.\n"
        "- Sentence 2: Name the strongest concrete driver from the latest context. If headlines exist, quote 1 headline title exactly.\n"
        "- Sentence 3 (ONLY if there is prior context): Explain why it moved since the prior update using concrete evidence (e.g., a new headline or newly surfaced association). Never enumerate keys or categories.\n"
        "\n"
        "If evidence is thin, say so directly (e.g., 'No meaningful recent coverage').\n"
        "\n"
        f"TICKER: {asset_ticker}\n"
        f"MODEL_PRICE_USD: {model_price_usd}\n"
        f"HAS_PRIOR: {'yes' if has_prior else 'no'}\n"
        f"{prior_block}"
        f"\nLATEST_CONTEXT:\n{new_feature_snapshot_json}\n"
    )


# end of LLM written Code
