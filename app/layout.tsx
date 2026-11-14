import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider, themeScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: { default: "Orbis", template: "%s · Orbis" },
  description: "Build, edit and export beautiful monthly station reports – PDF and Word, in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
