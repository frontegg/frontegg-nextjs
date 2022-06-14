import { AppProps } from 'next/app';
import { withFronteggApp } from '@frontegg/nextjs';
import './app.css';

function CustomApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default withFronteggApp(CustomApp, {
  authOptions: {
    routes: {
      signUpUrl: '/signup',
      loginUrl:'/login'
    },
  },
  hostedLoginBox: true,
  customLoader: true,
});
