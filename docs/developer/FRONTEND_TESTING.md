# Frontend Testing Guide

**Complete guide to testing React components and features in JobSentinel v2.0.0**

---

## Table of Contents

- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Organization](#test-organization)
- [Writing Component Tests](#writing-component-tests)
- [Mocking Tauri Commands](#mocking-tauri-commands)
- [Testing Hooks and Contexts](#testing-hooks-and-contexts)
- [E2E Testing with Playwright](#e2e-testing-with-playwright)
- [Best Practices](#best-practices)

---

## Overview

JobSentinel frontend uses a modern testing stack optimized for React 19 and Tauri integration:

- **Vitest** - Unit testing framework (Vite-native, fast)
- **React Testing Library** - Component testing (semantic queries)
- **Playwright** - End-to-end testing (real browser automation)
- **@testing-library/user-event** - User interaction simulation

### Testing Philosophy

> **"Test behavior, not implementation. Users interact with UI, not code."**

We prioritize:

1. **Semantic queries** - Test what users see (role, label, text)
2. **User events** - Simulate realistic interactions (click, type, submit)
3. **Accessibility** - All tests validate ARIA and semantic HTML
4. **Isolation** - Components tested independently with proper mocking
5. **Speed** - Unit tests run in milliseconds, E2E tests in seconds

---

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
npm test

# Run in watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test -- src/components/GhostIndicator.test.tsx

# Run tests matching pattern
npm test -- --grep "GhostIndicator"

# Run with coverage report
npm run test:coverage

# Run single test only
npm test -- --reporter=verbose src/components/Button.test.tsx
```

### End-to-End Tests (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (watch + debug interface)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npm run test:e2e -- e2e/app.spec.ts

# Run tests matching pattern
npm run test:e2e -- --grep "Dashboard"

# Debug single test
npm run test:e2e:headed -- --debug e2e/app.spec.ts
```

---

## Test Organization

### Directory Structure

```text
src/
├── components/
│   ├── Button.tsx
│   ├── Button.test.tsx              # Co-located with component
│   ├── GhostIndicator/
│   │   ├── GhostIndicator.tsx
│   │   └── GhostIndicator.test.tsx
│   └── ...
├── hooks/
│   ├── useKeyboardNavigation.ts
│   ├── useKeyboardNavigation.test.ts
│   └── ...
├── contexts/
│   ├── KeyboardShortcutsContext.tsx
│   ├── KeyboardShortcutsContext.test.tsx
│   └── ...
├── pages/
│   ├── Dashboard.tsx
│   ├── Dashboard.test.tsx
│   └── ...
├── utils/
│   ├── export.ts
│   ├── export.test.ts
│   └── ...
└── test/
    └── setup.ts                      # Vitest configuration
e2e/
├── app.spec.ts                       # Full application flow
├── screenshots.spec.ts               # Visual features
└── ...
```

### Naming Conventions

- **Component tests**: `ComponentName.test.tsx` (co-located)
- **Hook tests**: `useHookName.test.ts`
- **Utility tests**: `utilityName.test.ts`
- **E2E tests**: `feature.spec.ts` (in `/e2e` directory)

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

describe("ComponentName", () => {
  describe("renders correctly", () => {
    it("should display the component", () => {
      render(<ComponentName />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });

  describe("user interactions", () => {
    it("should handle click events", async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(<ComponentName onClick={handleClick} />);
      await user.click(screen.getByRole("button"));

      expect(handleClick).toHaveBeenCalledOnce();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<ComponentName label="Submit Form" />);
      expect(screen.getByRole("button", { name: "Submit Form" })).toBeInTheDocument();
    });
  });
});
```

---

## Writing Component Tests

### Pattern 1: Basic Component Rendering

**Test**: Component renders with correct content

```typescript
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe("Button", () => {
  it("should render with text content", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    render(<Button className="primary">Submit</Button>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("primary");
  });
});
```

**Benefits**:

- Semantic queries (role-based) match user perspective
- Tests output, not implementation
- CSS class tests catch styling breaks

### Pattern 2: User Interactions

**Test**: Component responds to user events

```typescript
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";

describe("Form", () => {
  it("should submit form on button click", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(<Form onSubmit={handleSubmit} />);

    const input = screen.getByRole("textbox", { name: "Name" });
    await user.type(input, "John Doe");

    const submitButton = screen.getByRole("button", { name: "Submit" });
    await user.click(submitButton);

    expect(handleSubmit).toHaveBeenCalledWith({ name: "John Doe" });
  });
});
```

**Benefits**:

- Uses `userEvent` instead of `fireEvent` (more realistic)
- Tests semantic role queries
- Validates props passed to callbacks

### Pattern 3: Async Operations

**Test**: Component handles async data loading

```typescript
import { render, screen, waitFor } from "@testing-library/react";

describe("JobsList", () => {
  it("should display jobs after loading", async () => {
    render(<JobsList />);

    // Initially shows loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // After API call, shows jobs
    await waitFor(() => {
      expect(screen.getByText("Senior Engineer - Acme Corp")).toBeInTheDocument();
    });
  });

  it("should handle errors gracefully", async () => {
    vi.mocked(getJobs).mockRejectedValue(new Error("API failed"));

    render(<JobsList />);

    await waitFor(() => {
      expect(screen.getByText(/error.*try again/i)).toBeInTheDocument();
    });
  });
});
```

**Benefits**:

- Tests loading and error states
- Uses `waitFor` for async assertions
- Validates error UI

### Pattern 4: Conditional Rendering

**Test**: Component renders different content based on props/state

```typescript
describe("GhostIndicator", () => {
  it("should not render when job is not ghost", () => {
    render(<GhostIndicator isGhost={false} />);
    expect(screen.queryByText(/ghost job/i)).not.toBeInTheDocument();
  });

  it("should display warning when job is ghost", () => {
    render(<GhostIndicator isGhost={true} reason="No activity in 30 days" />);
    expect(screen.getByText(/ghost job/i)).toBeInTheDocument();
    expect(screen.getByText(/no activity in 30 days/i)).toBeInTheDocument();
  });
});
```

**Benefits**:

- Tests both rendering and non-rendering states
- Uses `queryBy` for absence checks
- Covers conditional logic

---

## Mocking Tauri Commands

### Pattern 1: Mocking `invoke()` Calls

Tauri commands are automatically mocked in `src/test/setup.ts`. Use `vi.mocked()` to configure responses:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { JobsPanel } from "./JobsPanel";

// Mock is auto-loaded from setup.ts
const mockedInvoke = vi.mocked(invoke);

describe("JobsPanel", () => {
  beforeEach(() => {
    mockedInvoke.mockClear();
  });

  it("should fetch jobs and display them", async () => {
    mockedInvoke.mockResolvedValue([
      { id: 1, title: "Engineer", company: "Acme" },
      { id: 2, title: "Designer", company: "TechCorp" },
    ]);

    render(<JobsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Engineer")).toBeInTheDocument();
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });

    // Verify command was called
    expect(mockedInvoke).toHaveBeenCalledWith("get_jobs", {});
  });

  it("should handle command errors", async () => {
    mockedInvoke.mockRejectedValue(new Error("Database error"));

    render(<JobsPanel />);

    await waitFor(() => {
      expect(screen.getByText(/error fetching jobs/i)).toBeInTheDocument();
    });
  });
});
```

### Pattern 2: Mocking Multiple Commands

**Test**: Component making multiple Tauri calls

```typescript
describe("ApplicationForm", () => {
  beforeEach(() => {
    mockedInvoke.mockClear();
  });

  it("should save and then refresh after form submission", async () => {
    const user = userEvent.setup();

    // Setup sequential mock responses
    mockedInvoke
      .mockResolvedValueOnce({ id: 123, status: "saved" }) // save_application
      .mockResolvedValueOnce(["New App"]) // get_applications

    render(<ApplicationForm />);

    const submitButton = screen.getByRole("button", { name: "Save" });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("New App")).toBeInTheDocument();
    });

    // Verify both commands were called
    expect(mockedInvoke).toHaveBeenNthCalledWith(1, "save_application", {
      title: "Expected Title",
    });
    expect(mockedInvoke).toHaveBeenNthCalledWith(2, "get_applications", {});
  });
});
```

### Pattern 3: Matching Command Arguments

**Test**: Verify exact arguments passed to Tauri command

```typescript
describe("NotificationSettings", () => {
  it("should save notification config with correct parameters", async () => {
    const user = userEvent.setup();

    render(<NotificationSettings />);

    await user.click(screen.getByRole("checkbox", { name: "Slack Notifications" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(mockedInvoke).toHaveBeenCalledWith("update_notification_config", {
      slack_enabled: true,
      discord_enabled: false,
    });
  });
});
```

**Benefits**:

- Verifies correct commands and arguments
- Tests integration with Tauri backend
- Catches command name typos

---

## Testing Hooks and Contexts

### Pattern 1: Testing Custom Hooks

**Test**: Hook logic in isolation

```typescript
import { renderHook, act } from "@testing-library/react";
import { useKeyboardNavigation } from "./useKeyboardNavigation";

describe("useKeyboardNavigation", () => {
  it("should navigate to next item on ArrowDown", () => {
    const { result } = renderHook(() => useKeyboardNavigation(["Item 1", "Item 2", "Item 3"]));

    expect(result.current.selectedIndex).toBe(0);

    act(() => {
      result.current.handleKeyDown({ key: "ArrowDown" } as KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(1);
  });

  it("should wrap around to first item at end", () => {
    const { result } = renderHook(() => useKeyboardNavigation(["A", "B", "C"]));

    act(() => {
      result.current.handleKeyDown({ key: "End" } as KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(2);

    act(() => {
      result.current.handleKeyDown({ key: "ArrowDown" } as KeyboardEvent);
    });

    expect(result.current.selectedIndex).toBe(0);
  });
});
```

**Benefits**:

- Tests hook logic without component
- Easy to set up and understand
- Hooks run in React environment

### Pattern 2: Testing Context Providers

**Test**: Context values and updates

```typescript
import { render, screen } from "@testing-library/react";
import { KeyboardShortcutsProvider, useKeyboardShortcuts } from "./KeyboardShortcutsContext";

const TestComponent = () => {
  const { shortcuts } = useKeyboardShortcuts();
  return <div>{shortcuts.length} shortcuts available</div>;
};

describe("KeyboardShortcutsContext", () => {
  it("should provide shortcuts to children", () => {
    render(
      <KeyboardShortcutsProvider>
        <TestComponent />
      </KeyboardShortcutsProvider>
    );

    expect(screen.getByText(/shortcuts available/i)).toBeInTheDocument();
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow();

    consoleSpy.mockRestore();
  });
});
```

---

## E2E Testing with Playwright

### Test Organization

E2E tests live in `/e2e` and test complete user workflows:

```text
e2e/
├── app.spec.ts              # Main application flows
├── screenshots.spec.ts      # Visual regression tests
├── fixtures/                # Test data
│   └── jobs.json
└── utils/                   # Helper functions
    └── test-utils.ts
```

### Pattern 1: Complete User Flow

**Test**: User navigates app and performs actions

```typescript
import { test, expect } from "@playwright/test";

test.describe("Job Search Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Visit app before each test
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should search jobs and apply filters", async ({ page }) => {
    // Search for jobs
    const searchBox = page.getByRole("searchbox", { name: "Search jobs" });
    await searchBox.fill("React Engineer");
    await searchBox.press("Enter");

    // Wait for results
    await expect(page.getByText(/showing.*results/i)).toBeVisible();

    // Apply filter
    await page.getByRole("button", { name: "Ghost Filter" }).click();
    await page.getByRole("option", { name: "Hide Ghost Jobs" }).click();

    // Verify filter applied
    await expect(page.getByText(/no ghost jobs/i)).toBeVisible();
  });
});
```

### Pattern 2: API Mocking in E2E Tests

**Test**: Mock backend responses for consistent testing

```typescript
test("should handle backend errors gracefully", async ({ page }) => {
  // Intercept Tauri command and return error
  await page.evaluate(() => {
    window.__MOCK_API_ERROR__ = "Database connection failed";
  });

  await page.goto("/");

  // Verify error message displayed
  await expect(page.getByText(/database connection failed/i)).toBeVisible();

  // Verify user can retry
  await page.getByRole("button", { name: "Retry" }).click();

  // Mock successful response for retry
  await page.evaluate(() => {
    window.__MOCK_API_ERROR__ = null;
  });

  await expect(page.getByText(/jobs loaded/i)).toBeVisible();
});
```

### Pattern 3: Visual Regression Testing

**Test**: Ensure UI hasn't changed unexpectedly

```typescript
test("should render dashboard with correct layout", async ({ page }) => {
  await page.goto("/");

  // Take screenshot and compare to baseline
  await expect(page).toHaveScreenshot("dashboard.png");
});

test("should maintain layout on mobile", async ({ page }) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto("/");

  await expect(page).toHaveScreenshot("dashboard-mobile.png");
});
```

### Running Playwright Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e e2e/app.spec.ts

# Update visual snapshots
npm run test:e2e -- --update-snapshots

# Debug with inspector
npm run test:e2e:headed -- --debug

# Generate HTML report
npm run test:e2e
# Open: playwright-report/index.html
```

---

## Best Practices

### DO ✅

- **Use semantic queries** - `getByRole()`, `getByLabelText()`, `getByText()`
- **Test behavior** - What user does and sees, not implementation
- **Test accessibility** - Roles, labels, ARIA attributes
- **Keep tests focused** - One concept per test
- **Use descriptive names** - Test name explains what and why
- **Mock external APIs** - Tauri commands, HTTP requests
- **Test error states** - Loading, error, success paths
- **Use `userEvent` over `fireEvent`** - More realistic interactions
- **Co-locate test files** - Test near the code it tests
- **Mock at boundaries** - Tauri, localStorage, network

### DON'T ❌

- Don't test implementation details - Test the interface
- Don't create complex test setup - Keep tests simple and independent
- Don't use implementation-based queries - `getByTestId()` as last resort
- Don't test framework behavior - Test your app logic
- Don't skip accessibility - It's not optional
- Don't commit failing tests - Fix or remove them
- Don't test third-party libraries - Trust they work
- Don't create test interdependencies - Each test standalone
- Don't use `console.log()` for debugging - Use test utilities

### Test Coverage Goals

| Category | Target | Method |
|----------|--------|--------|
| Components | 80%+ | Unit tests per component |
| Hooks | 85%+ | Hook-specific tests |
| Utils | 90%+ | Unit tests for functions |
| Critical flows | 100% | E2E tests for main workflows |
| Accessibility | 100% | Semantic queries in all tests |

### Running Coverage Reports

```bash
npm run test:coverage

# Open coverage report
open coverage/index.html
```

---

## Debugging Failed Tests

### 1. Check Test Output

```bash
# Run test with full output
npm test -- --reporter=verbose src/components/Button.test.tsx

# Show console logs in test
npm test -- --reporter=verbose
```

### 2. Use Debug Mode

```typescript
import { render, screen } from "@testing-library/react";

render(<MyComponent />);

// Print DOM tree
screen.debug();

// Print specific element
screen.debug(screen.getByRole("button"));
```

### 3. Run Single Test

```bash
npm test -- --grep "specific test name"

# Or use test.only in test file
it.only("should test this one thing", () => {
  // Only this test runs
});
```

### 4. Playwright Inspector

```bash
npm run test:e2e:headed -- --debug

# Browser opens with Inspector panel
# Step through test manually
```

---

## Common Patterns

### Testing Props Variations

```typescript
describe("Badge", () => {
  const variants = ["default", "success", "warning", "error"] as const;

  variants.forEach((variant) => {
    it(`should apply ${variant} styles`, () => {
      render(<Badge variant={variant} />);
      expect(screen.getByRole("status")).toHaveClass(`badge-${variant}`);
    });
  });
});
```

### Testing Keyboard Shortcuts

```typescript
import userEvent from "@testing-library/user-event";

test("should trigger search on Cmd+K", async () => {
  const user = userEvent.setup();
  const handleSearch = vi.fn();

  render(<App onSearch={handleSearch} />);

  await user.keyboard("{Meta>}k{/Meta}");

  expect(handleSearch).toHaveBeenCalled();
});
```

### Testing External Links

```typescript
test("should open external link in browser", async () => {
  render(<HelpLink href="https://docs.example.com" />);

  const link = screen.getByRole("link", { name: /documentation/i });
  expect(link).toHaveAttribute("target", "_blank");
  expect(link).toHaveAttribute("rel", "noopener noreferrer");
});
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Web Accessibility Guidelines](https://www.w3.org/WAI/test-evaluate/)

---

**Last Updated**: January 17, 2026
**Stack**: Vitest 4.0.17 + React Testing Library 16.3.1 + Playwright 1.57.0
**Target**: React 19 + Tauri 2.x
**Maintained By**: JobSentinel Team
