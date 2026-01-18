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
e2e-tests/
├── specs/
│   ├── dashboard.e2e.js      # Dashboard functionality
│   ├── settings.e2e.js       # Settings page tests
│   └── one-click-apply.e2e.js # One-Click Apply settings
├── screenshots/              # Captured screenshots
├── wdio.conf.js             # WebdriverIO configuration
└── package.json             # Test dependencies
```

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
