# Contributing


Thanks for taking a look — I appreciate it. This is a small personal project I maintain for myself and to share with friends and others who find it helpful. I'm happy to accept fixes and helpful additions.

If you find a bug or want to add something, the easiest way is to open an issue describing what you saw and how to reproduce it.

If you'd like to send a change:

1. Fork the repo and make a branch.
2. Make the change and test it locally.
3. Push the branch and open a PR.

A few notes I care about:
- Keep things small and focused — small PRs are easier to review.
- Add or update docs when you change behavior.
- No secrets in commits, please.

Local setup (quick)

```bash
git clone https://github.com/YOUR_USERNAME/job-private-scraper-filter.git
cd job-private-scraper-filter
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# .venv\Scripts\activate   # Windows PowerShell
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
cp user_prefs.example.json user_prefs.json
# Edit the files and run the basic health check
python agent.py --mode health
```

Testing tips
- Run `python agent.py --mode test` to exercise notifications and basic flows.
- If you change scraping logic, try a few real pages to make sure selectors still work.

Areas where help is useful
- Additional job board scrapers
- Improving robustness around flaky sites
- Better docs or examples for common companies

Thanks again — pull requests and issues are welcome. If I don't respond quickly, feel free to nudge me on the issue or PR. I usually try to help folks who are testing or using the project.