import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs';
import './app.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withFronteggApp(CustomApp, {
  hostedLoginBox: !!process.env['FRONTEGG_TEST_URL'],
  customLoader: true,
  authOptions: process.env['FRONTEGG_TEST_URL']
    ? {
        keepSessionAlive: true,
      }
    : {},
});
