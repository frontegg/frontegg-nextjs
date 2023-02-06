import { FronteggAppProvider } from '@frontegg/nextjs/server';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head></head>
      <body>
        {/*@ts-expect-error typescript not familiar with server components*/}
        <FronteggAppProvider hostedLoginBox authOptions={{ keepSessionAlive: true }}>
          {children}
        </FronteggAppProvider>
      </body>
    </html>
  );
}
