import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs/pages';
import './app.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

const options = {
  hostedLoginBox: true,
  customLoader: true,
  authOptions: {
    keepSessionAlive: true,
  },
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
