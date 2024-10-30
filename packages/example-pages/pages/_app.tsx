import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs/pages';
import './app.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

const options = {
  hostedLoginBox: false,
  // customLoader: true,
  authOptions: {
    keepSessionAlive: true,
  },
  cdnUrl: 'http://localhost:3001',
};
export default withFronteggApp(
  CustomApp,
  typeof window === 'undefined'
    ? options
    : {
        ...options,
        // @ts-ignore
        ...window.FRONTEGG_APP_OPTIONS,
      }
);
