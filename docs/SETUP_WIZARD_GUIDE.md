# Setup wizard notes

`python3 scripts/setup_wizard.py` walks through the initial config if you’d rather answer prompts than edit JSON by hand. I built it for friends who wanted a softer landing.

## What the wizard asks for

- Resume text (paste it or point to a `.txt` file)
- Skills or keywords you care about
- Target titles, seniority, compensation, and work style
- Job boards or company URLs you want to watch
- Notification preferences (Slack webhook, email digest, match threshold)

At the end it writes `.env`, `config/user_prefs.json`, and a small profile file you can revisit later.

## Resume analysis

If you provide a resume, the wizard skims it for skills and seniority hints. It’s not fancy—just enough to pre-populate filters so you can tweak them instead of starting blank. Skip the step if you don’t feel like sharing anything.

## Updating later

Re-run the wizard any time. It preserves existing answers where it can and lets you override fields you want to change. You can also edit the generated files directly; the wizard won’t mind.
