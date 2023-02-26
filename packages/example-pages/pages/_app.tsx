import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs/pages';
import './app.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withFronteggApp(CustomApp, {
  hostedLoginBox: true,
  customLoader: true,
  authOptions: {
    keepSessionAlive: true,
  },
});
