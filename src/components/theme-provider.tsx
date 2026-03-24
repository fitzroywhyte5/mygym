"use client";

import * as React from "react";

export function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: "dark" | "light";
}) {
  React.useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("dark", "light");
    root.classList.add(defaultTheme);
  }, [defaultTheme]);

  return <>{children}</>;
}
