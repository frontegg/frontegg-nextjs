import { AppProps } from 'next/app';
import { FronteggProvider, withFronteggApp } from '@frontegg/nextjs';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <FronteggProvider {...pageProps}>
      <Component {...pageProps} />
    </FronteggProvider>
  );
}

export default withFronteggApp(CustomApp);
