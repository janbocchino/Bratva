import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'huzzdaq',
  description: 'huzzdaq frontend',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <body className='antialiased min-h-dvh flex flex-col'>
        {/* beginning of LLM written Code, Model: gpt-5.3-codex-low */}
        <header className='border-b border-black/10'>
          <nav className='mx-auto flex w-full max-w-5xl items-center gap-6 px-6 py-4 text-sm uppercase tracking-wide'>
            <Link href='/'>home</Link>
            <Link href='/explore'>explore</Link>
            <Link href='/account'>account</Link>
          </nav>
        </header>
        <main className='mx-auto flex w-full max-w-5xl grow flex-col px-6 py-8'>{children}</main>
        {/* end of LLM written Code */}
      </body>
    </html>
  );
}
