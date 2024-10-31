import { AppContextType, AppPropsType, NextComponentType } from 'next/dist/shared/lib/utils';
import { AppInitialProps } from 'next/app';
import { AllUserData } from '../../types';
import { FronteggAppOptions } from '@frontegg/types';

export type FronteggCustomApp = NextComponentType<AppContextType & AllUserData, AppInitialProps, AppPropsType>;
export type FronteggCustomAppClass = ((props: AppPropsType<any>) => JSX.Element) & {
  getInitialProps?: FronteggCustomApp['getInitialProps'];
};

export type WithFronteggAppOptions = Omit<FronteggAppOptions, 'contextOptions' | 'hostedLoginBox'> & {
  contextOptions?: Partial<FronteggAppOptions['contextOptions']>;

  /**
   * @deprecated use FRONTEGG_HOSTED_LOGIN environment variable instead
   */
  hostedLoginBox?: FronteggAppOptions['hostedLoginBox'];
};
