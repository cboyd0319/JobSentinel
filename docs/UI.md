# UI Guide

JobSentinel's interface with improved visual design and real-time updates.

## What it is

Two interfaces: **GUI launcher** (Windows/macOS desktop app) and **Web UI** (browser-based, React 19 + WebSocket).

## Quick start

### GUI Launcher (Windows/macOS)
```bash
# Windows
launch-gui.bat

# macOS
./launch-gui.sh
```

Double-click to start. No terminal needed.

### Web UI
```bash
python -m jsa.cli web --port 8000
# Open: http://localhost:8000
```

Live job updates via WebSocket. No refresh needed.

## GUI Launcher (Desktop)

**What you get:**
- Start/stop JobSentinel
- View activity log
- Configure settings
- Run health checks
- Open web UI

**Design:**
- Professional blue/slate palette
- 12-14pt fonts (WCAG AA compliant)
- Hover effects on all buttons
- 25px+ click targets

**Keyboard:**
- `Tab` → navigate
- `Enter` → activate
- `Esc` → cancel/close

## Web UI (Browser)

### Dashboard
```
/                Jobs overview + search
/jobs            Full job list with filters
/jobs/:id        Job details
/config          Settings editor
/logs            System logs
/health          Health check
```

### Real-time updates
WebSocket connection shows:
- New jobs found (instant notification)
- Scraping progress
- Scoring updates
- Error alerts

**Refresh not needed.** Data streams live.

### Features

**Job cards:**
- Company, title, location
- Score badge (0-100)
- Salary range
- Posted date
- Quick actions (save, archive, apply link)

**Filters:**
- Keywords (multi-select)
- Min/max salary
- Location (remote, city, state)
- Date range
- Score threshold

**Search:**
- Full-text across title, company, description
- Regex support (`/pattern/`)
- Debounced (300ms)

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `n` | Next job |
| `p` | Previous job |
| `s` | Save job |
| `a` | Archive job |
| `Esc` | Clear filters |

### Performance

| Metric | Value |
|--------|-------|
| Initial load | <2s (100 jobs) |
| Filter/search | <100ms |
| WebSocket latency | <50ms |
| Animation FPS | 60fps |

Tested with 10,000+ jobs in SQLite.

## Customization

### Theme (web UI)
```css
/* static/css/custom.css */
:root {
  --primary: #0073e6;      /* Brand color */
  --success: #10b981;      /* Positive actions */
  --danger: #ef4444;       /* Warnings/errors */
  --font-base: 16px;       /* Base font size */
}
```

Restart web server to apply.

### GUI colors
```python
# launcher_gui.py, line 42
COLORS = {
    'primary': '#0073e6',    # Button background
    'bg': '#f8fafc',         # Window background
    'text': '#1e293b',       /* Text color
}
```

Requires Python restart.

## Accessibility (WCAG 2.1 AA)

**Compliance:**
- ✅ Contrast ratio 4.5:1+
- ✅ Keyboard navigation
- ✅ Screen reader labels (ARIA)
- ✅ 44px+ touch targets
- ✅ Focus indicators
- ✅ No flashing <3Hz

**Screen readers:**
- NVDA (Windows)
- VoiceOver (macOS)
- JAWS (Windows)

Tested with all three.

## Troubleshooting

### GUI won't start
```bash
# Check Python version
python --version  # Need 3.12+

# Reinstall dependencies
pip install -e .
```

### Web UI blank page
```bash
# Check frontend built
ls -la frontend/dist/

# Rebuild if missing
cd frontend && npm run build
```

### WebSocket disconnects
```bash
# Check firewall rules
# Allow port 8000 TCP

# Check proxy/VPN
# Some block WebSocket
```

### Slow performance
```bash
# Check SQLite size
ls -lh data/jobs.sqlite

# Vacuum if >1GB
sqlite3 data/jobs.sqlite "VACUUM;"
```

### Dark mode (web UI)
Not yet supported. Use browser dark mode extension:
- Dark Reader (Chrome/Firefox)
- Night Eye (Safari)

## What's next

Planned for v0.7:
- Native dark mode toggle
- Custom theme creator
- Mobile-responsive layout
- Offline mode (PWA)

Open issues for requests: https://github.com/cboyd0319/JobSentinel/issues
