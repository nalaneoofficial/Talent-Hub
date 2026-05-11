const KEY = "theme";
export type Theme = "light" | "dark";

export const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  const t = localStorage.getItem(KEY) as Theme | null;
  if (t === "light" || t === "dark") return t;
  // Default to LIGHT — never follow OS preference. User opts in via Settings.
  return "light";
};

export const applyTheme = (t: Theme) => {
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem(KEY, t);
};

if (typeof window !== "undefined") applyTheme(getStoredTheme());
