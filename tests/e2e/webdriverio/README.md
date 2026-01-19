# JobSentinel E2E Tests

End-to-end tests for JobSentinel using WebdriverIO and Tauri Driver.

## Prerequisites

1. **Tauri Driver** - Install the tauri-driver CLI:

   ```bash
   cargo install tauri-driver
   ```

2. **Built App** - Build the Tauri app for testing:

   ```bash
   cd ..
   npm run tauri build
   ```

3. **Dependencies** - Install test dependencies:

   ```bash
   npm install
   ```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests with Screenshots

Captures screenshots after each test for documentation:

```bash
npm run screenshots
```

Screenshots are saved to `./screenshots/`.

## Test Structure

```text
tests/e2e/webdriverio/
├── specs/
│   ├── dashboard.e2e.js        # Dashboard functionality
│   ├── settings.e2e.js         # Settings page tests
│   ├── applications.e2e.js     # Application tracking Kanban
│   ├── market.e2e.js           # Market Intelligence tabs & charts
│   ├── resume.e2e.js           # Resume matcher with skills
│   ├── resume-builder.e2e.js   # Resume builder wizard
│   ├── salary.e2e.js           # Salary AI predictions
│   └── one-click-apply.e2e.js  # One-Click Apply settings
├── screenshots/                # Captured screenshots
├── wdio.conf.js               # WebdriverIO configuration
└── package.json               # Test dependencies
```

## Test Coverage

| Page | Test File | Tests |
|------|-----------|-------|
| Dashboard | `dashboard.e2e.js` | Load, nav, stats, search, shortcuts |
| Settings | `settings.e2e.js` | Nav, preferences, notifications, save |
| Applications | `applications.e2e.js` | Kanban, stats, cards, reminders |
| Market | `market.e2e.js` | Tabs, snapshot, charts, heatmap, alerts |
| Resume | `resume.e2e.js` | Upload, skills, categories, gap analysis |
| Resume Builder | `resume-builder.e2e.js` | Wizard, steps, templates, export |
| Salary | `salary.e2e.js` | Prediction, benchmark, comparison, negotiation |
| One-Click Apply | `one-click-apply.e2e.js` | Profile, screening, ATS detection |

## Writing New Tests

Tests use WebdriverIO's async/await API:

```javascript
describe('Feature', () => {
  it('should do something', async () => {
    // Find elements
    const button = await $('button.primary');

    // Interact
    await button.click();

    // Assert
    await expect(button).toBeDisplayed();
  });
});
```

## Selectors

Since Tauri apps render in a WebView, use standard CSS selectors:

- **By class**: `$('.my-class')`
- **By ID**: `$('#my-id')`
- **By text**: `$('button:has-text("Click me")')`
- **By attribute**: `$('[data-testid="my-element"]')`

## Troubleshooting

### tauri-driver not found

Install it with:

```bash
cargo install tauri-driver
```

### App doesn't start

Ensure you've built the app first:

```bash
npm run tauri build
```

### Tests timeout

Increase the timeout in `wdio.conf.js`:

```javascript
mochaOpts: {
  timeout: 180000, // 3 minutes
}
```

### WebView version mismatch (Windows)

On Windows, ensure Edge WebView2 version matches Edge WebDriver. Update WebView2 manually if needed.

## CI/CD Integration

See the [Tauri CI Guide](https://v2.tauri.app/develop/tests/webdriver/ci/) for GitHub Actions setup.

## Resources

- [Tauri WebDriver Docs](https://v2.tauri.app/develop/tests/webdriver/)
- [WebdriverIO Documentation](https://webdriver.io/docs/gettingstarted)
- [Tauri Testing Discussion](https://github.com/tauri-apps/tauri/discussions/10123)
