import { FronteggAppProvider } from '@frontegg/nextjs/server';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head></head>
      <body>
        {/*@ts-ignore typescript not familiar with server components*/}
        <FronteggAppProvider hostedLoginBox>{children}</FronteggAppProvider>
      </body>
    </html>
  );
}
