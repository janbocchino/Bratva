"""Edit these values and restart the supervisor to change cadence."""

# beginning of LLM written Code, Model: claude-opus-4-7
INTERVALS_SECONDS: dict[str, int] = {
    "scrapeForbes_v2": 4 * 3600,
    "followers_v2": 16 * 3600,
    "extended_associations_v2": 24 * 3600,
    "news": 10,
    "valuation_summary": 10 * 60,
}

NEWS_LOOKBACK_HOURS = 48
# end of LLM written Code
