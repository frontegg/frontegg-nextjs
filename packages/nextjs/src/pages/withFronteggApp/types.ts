import { AppContextType, AppPropsType, NextComponentType } from 'next/dist/shared/lib/utils';
import { AppInitialProps } from 'next/app';
import { AllUserData } from '../../types';
import { FronteggAppOptions } from '@frontegg/types';

export type FronteggCustomApp = NextComponentType<AppContextType & AllUserData, AppInitialProps, AppPropsType>;
export type FronteggCustomAppClass = ((props: AppPropsType<any>) => JSX.Element) & {
  getInitialProps?: FronteggCustomApp['getInitialProps'];
};

export type WithFronteggAppOptions = Omit<FronteggAppOptions, 'contextOptions'> & {
  contextOptions?: Partial<FronteggAppOptions['contextOptions']>;
};
