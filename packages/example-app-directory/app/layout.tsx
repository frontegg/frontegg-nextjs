import { FronteggAppProvider } from '@frontegg/nextjs/app';
import AppLoader from '../components/app-loader';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head></head>
      <body>
        {/* @ts-expect-error Server Component for more details visit: https://github.com/vercel/next.js/issues/42292 */}
        <FronteggAppProvider
          customLoader
          authOptions={{ keepSessionAlive: true }}
          customLoginOptions={{ paramKey: 'organization' }}
          alwaysVisibleChildren={<AppLoader />}
        >
          {children}
        </FronteggAppProvider>
      </body>
    </html>
  );
}
