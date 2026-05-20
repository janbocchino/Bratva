import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
        {children}
        {/* end of LLM written Code */}
      </body>
    </html>
  );
}
