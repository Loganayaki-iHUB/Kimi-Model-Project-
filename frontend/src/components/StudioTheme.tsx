"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const storageKey = "kimi:theme";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function StudioThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const next = event.newValue === "dark" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem(storageKey, next); } catch { /* Theme changes still work when storage is unavailable. */ }
  };
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function StudioThemeToggle() {
  const { theme, toggle } = useContext(ThemeContext);
  const label = `Switch to ${theme === "light" ? "dark" : "light"} theme`;
  return <button type="button" className="icon-button studio-theme-toggle" aria-label={label} title={label} onClick={toggle}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button>;
}
