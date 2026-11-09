import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Website & Web App Builder',
  description: 'Generate complete websites and web apps with natural language prompts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

