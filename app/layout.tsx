import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// beginning of LLM written Code, Model: claude-4.6-sonnet-medium-thinking
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});
// end of LLM written Code

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
    <html lang='en' className={inter.variable}>
      <body className='font-sans antialiased min-h-dvh flex flex-col'>
        {/* beginning of LLM written Code, Model: gpt-5.3-codex-low */}
        {children}
        {/* end of LLM written Code */}
      </body>
    </html>
  );
}
