import { useEffect, useState, ReactNode } from "react";
import { ThemeContext } from "./themeContextDef";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "jobsentinel-theme";
const HIGH_CONTRAST_KEY = "jobsentinel-high-contrast";

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark"; // Default to dark when system preference unavailable
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      // Default to dark mode for new users
      return stored || "dark";
    }
    return "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (theme === "system") return getSystemTheme();
    return theme;
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(HIGH_CONTRAST_KEY) === "true";
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;

    const updateTheme = () => {
      const resolved = theme === "system" ? getSystemTheme() : theme;
      setResolvedTheme(resolved);

      if (resolved === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    updateTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        updateTheme();
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Apply high contrast mode
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.setAttribute("data-high-contrast", "true");
    } else {
      root.removeAttribute("data-high-contrast");
    }
  }, [highContrast]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "light" ? "dark" : "light");
  };

  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem(HIGH_CONTRAST_KEY, String(enabled));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, highContrast, setHighContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

// useTheme hook is in src/hooks/useTheme.ts to satisfy react-refresh/only-export-components
