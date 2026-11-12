import "./globals.css";
import "./studio-theme.css";
import type { Metadata } from "next";
import { StudioThemeProvider } from "../components/StudioTheme";

export const metadata: Metadata = {
  title: "Kimi AI Studio — From idea to website",
  description:
    "Shape your idea, review a thoughtful plan, and build a beautiful website with your favourite AI model.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('kimi:theme')==='dark'?'dark':'light'}catch{}" }} /></head>
      <body><StudioThemeProvider>{children}</StudioThemeProvider></body>
    </html>
  );
}
