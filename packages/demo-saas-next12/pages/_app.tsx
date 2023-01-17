import { AppProps } from 'next/app';
import { FronteggProviderSSG } from '@frontegg/nextjs';
import './app.css';

export default function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <FronteggProviderSSG hostedLoginBox>
      <Component {...pageProps} />
    </FronteggProviderSSG>
  );
}
