"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
export const useTheme = () => useContext(Ctx);

/** Inline script (rendered in <head>) so the right theme is applied before first paint. */
export const themeScript = `try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light"), []);
  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem("theme", next); } catch {}
  };
  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
