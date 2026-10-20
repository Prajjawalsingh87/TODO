import { useCallback, useEffect, useState } from "react";

// Keep in sync with the inline boot script in index.html, which applies the
// theme before first paint so there is no flash of the wrong colours.
const STORAGE_KEY = "color-theme";
const THEME_COLOR = { light: "#4f46e5", dark: "#0f1625" };

const darkQuery = () => window.matchMedia?.("(prefers-color-scheme: dark)");

const readSaved = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

const systemTheme = () => (darkQuery()?.matches ? "dark" : "light");

function applyTheme(theme) {
  const root = document.documentElement;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  if (root.dataset.theme === theme) return;
  // Switch every colour at once instead of letting transition classes fade
  // some elements later than others.
  const freeze = document.createElement("style");
  freeze.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(freeze);
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  window.getComputedStyle(document.body).opacity; // flush styles before re-enabling transitions
  setTimeout(() => freeze.remove(), 0);
}

// Follows the OS setting until the user picks a theme, then remembers it.
export default function useTheme() {
  const [saved, setSaved] = useState(readSaved);
  const [system, setSystem] = useState(systemTheme);
  const theme = saved ?? system;

  useEffect(() => {
    const query = darkQuery();
    if (!query) return undefined;
    const onChange = (e) => setSystem(e.matches ? "dark" : "light");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSaved(readSaved());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => applyTheme(theme), [theme]);

  const toggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked (private mode): the choice lasts for this visit only.
    }
    setSaved(next);
  }, [theme]);

  return { theme, toggle };
}
