# ChatGPT (optional)

If you want a bit of AI help for scoring, this project can use OpenAI. It's optional — the tool works fine without it.

Setup

1. (Optional) Install the OpenAI client in your venv:

```bash
pip install openai tiktoken
```

2. Get an API key from OpenAI and add it to `.env`:

```bash
LLM_ENABLED=true
OPENAI_API_KEY=sk-your-api-key
```

3. Test it:

```bash
python3 -m src.agent --mode test
```

How it helps
- Runs AI scoring only on jobs that pass your basic rules
- Combines rule scores and AI scores into a final number (you can tweak weights)
- Falls back to rules-only if the API is unavailable

Cost notes
- You pay OpenAI for tokens. I try to keep usage low with pre-filtering and caps.
- If you're curious about costs, watch token usage in the health check.

Config options
- `LLM_ENABLED` and `OPENAI_API_KEY` in `.env`
- Model and limits can be adjusted in `.env` if you want to change cost/quality tradeoffs

Privacy
- Only job text is sent to the API — no personal data
- Keep your API key in `.env` and don't commit it

If you want help picking settings for cost vs quality, tell me how many jobs/day you expect and I can suggest defaults.