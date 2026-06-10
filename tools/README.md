# Tools

Internal automation — scrapers, list builders, audit scripts.

## Currently at repo root (move here)

- `scraper.py` — the prospect-list scraper that produced `leads.csv`
- `requirements.txt`, `.venv/`, `__pycache__/` — Python deps for the scraper
- `leads.csv`, `leads_partial.csv`, `smoke.csv` — outputs (should live in `tools/scraper/data/`, gitignored)
- `scraper.log` — also gitignore

## Future tools to build

- `lead-form-audit.py` — automate the "I filled out your form 20 min ago" check before video outreach. Takes a list of prospect URLs, submits a tagged test lead, tracks who replies and when. **This is the single highest-leverage tool to build** — it generates the hook for every LinkedIn video.
- `prompt-builder.py` — fills a vertical-specific prompt template with client-supplied training data
