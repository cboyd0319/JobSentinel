import { useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { readStorageValue, writeStorageValue } from "../../shared/browserStorage";
import { ThemeContext } from "../../shared/theme/themeContext";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "jobsentinel-theme";
const HIGH_CONTRAST_KEY = "jobsentinel-high-contrast";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark"; // Default to dark when system preference unavailable
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStorageValue("local", STORAGE_KEY);
    return isTheme(stored) ? stored : "dark";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (theme === "system") return getSystemTheme();
    return theme;
  });

  const [highContrast, setHighContrastState] = useState<boolean>(() => {
    return readStorageValue("local", HIGH_CONTRAST_KEY) === "true";
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

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    writeStorageValue("local", STORAGE_KEY, newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const currentResolved = prev === "system" ? getSystemTheme() : prev;
      const newTheme = currentResolved === "light" ? "dark" : "light";
      writeStorageValue("local", STORAGE_KEY, newTheme);
      return newTheme;
    });
  }, []);

  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    writeStorageValue("local", HIGH_CONTRAST_KEY, String(enabled));
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    highContrast,
    setHighContrast,
  }), [theme, resolvedTheme, setTheme, toggleTheme, highContrast, setHighContrast]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
