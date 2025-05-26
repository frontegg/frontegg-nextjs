import { AppProps } from 'next/app';
import '../styles/globals.css'
import React from 'react';
import dynamic from 'next/dynamic';
// import DynamicProvider from '@/components/DynamicProvider';

const DynamicProvider =
  dynamic(() => import('../components/DynamicProvider')
    , {
    loading: () => <p>Loading...</p>,
    ssr: false
  }
  )

function CustomApp({ Component, pageProps }: AppProps) {
  return <>
    <React.StrictMode>
      <DynamicProvider>
        <Component {...pageProps} />
      </DynamicProvider>
    </React.StrictMode>
  </>
}

export default CustomApp
