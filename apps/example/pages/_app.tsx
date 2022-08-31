import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withFronteggApp(CustomApp, {});
