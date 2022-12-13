import { FronteggAppProvider } from '@frontegg/nextjs/server';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // @ts-ignore typescript not familiar with server components
    <FronteggAppProvider hostedLoginBox authOptions={{ keepSessionAlive: true }}>
      <html>
        <head></head>
        <body>{children}</body>
      </html>
    </FronteggAppProvider>
  );
}
