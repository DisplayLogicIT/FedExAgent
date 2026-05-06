import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import Sidebar from '@/components/sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'FedEx Agent Platform',
  description: 'AI-powered shipping operations dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@600;700;800&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <div className="app-shell">
            <Sidebar />
            <main className="main">{children}</main>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
