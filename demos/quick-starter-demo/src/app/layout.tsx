import { FronteggAppProvider } from '@frontegg/nextjs/app';
import { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Frontegg App',
  description: 'This application is using fronegg to manage authentication and authorization',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head></head>
      <body className={inter.className}>
        <FronteggAppProvider>{children}</FronteggAppProvider>
      </body>
    </html>
  );
}
