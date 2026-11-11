import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loga Studio — From idea to website",
  description:
    "Shape your idea, review a thoughtful plan, and build a beautiful website with your favourite AI model.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
