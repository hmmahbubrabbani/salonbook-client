import type { Metadata } from 'next';
import { Navbar } from '@/component/shared/Navbar';
import { Footer } from '@/component/shared/Footer';
import { Toaster } from '@/components/ui/toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'SalonBook — Salon Appointments & Beauty Services',
  description: 'Book salon treatments, explore categories, and manage appointments online.',
};

const themeInitScript = `
  try {
    var saved = localStorage.getItem('salonbook-theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var mode = saved === 'dark' || saved === 'light' ? saved : (prefersDark ? 'dark' : 'light');
    var root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = mode;
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }}/>
      </head>
      <body
        suppressHydrationWarning
        className="flex min-h-screen flex-col bg-background text-foreground antialiased"
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}