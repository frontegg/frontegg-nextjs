import React, { FC, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { initialize, AppHolder, FronteggApp } from '@frontegg/js';
import { FronteggAppOptions } from '@frontegg/types';
import { createFronteggStore } from '@frontegg/redux-store';
import {
	FronteggStoreProvider,
	useAuthActions,
	useAuthUserOrNull,
} from '@frontegg/react-hooks';
import {
	ContextHolder,
	RedirectOptions,
	fronteggAuthApiRoutes,
} from '@frontegg/rest-api';
import { NextRouter, useRouter } from 'next/router';
import { MeAndTenants, FronteggNextJSSession } from './types';
import AppContext from './AppContext';

export type FronteggProviderProps = Omit<FronteggAppOptions, 'contextOptions'> &
	MeAndTenants & {
	children?: ReactNode;
	session?: FronteggNextJSSession;
	envAppUrl: string;
	envBaseUrl: string;
	envClientId: string;
	contextOptions?: Omit<FronteggAppOptions['contextOptions'], 'baseUrl'>;
};

type ConnectorProps = FronteggProviderProps & {
	router: NextRouter;
	appName?: string;
};

const requestAuthorizeSSR = ({
								 app,
								 accessToken,
								 user,
								 tenants,
								 refreshToken,
							 }: {
	app: FronteggApp | null;
} & Partial<Pick<FronteggNextJSSession, 'accessToken' | 'refreshToken'>> &
	MeAndTenants) => {
	app?.store.dispatch({
		type: 'auth/requestAuthorizeSSR',
		payload: {
			accessToken,
			user: user ? { ...user, refreshToken } : null,
			tenants,
		},
	});
};

const Connector: FC<ConnectorProps> = ({
										   router,
										   appName,
										   hostedLoginBox,
										   customLoginBox,
										   user,
										   tenants,
										   session,
										   ...props
									   }) => {
	const { accessToken, refreshToken } = session ?? {};
	const isSSR = typeof window === 'undefined';
	const storeHolder = useRef<any>({});

	const baseName = props.basename ?? router.basePath;

	const onRedirectTo = useCallback((_path: string, opts?: RedirectOptions) => {
		let path = _path;
		if (path.startsWith(baseName)) {
			path = path.substring(baseName.length);
		}
		if (opts?.preserveQueryParams) {
			path = `${path}${window.location.search}`;
		}
		if (opts?.refresh && !isSSR) {
			// @ts-ignore
			window.Cypress ? router.push(path) : (window.location.href = path);
		} else {
			opts?.replace ? router.replace(path) : router.push(path);
		}
	}, []);

	const contextOptions = useMemo(
		() => ({
			baseUrl: (path: string) => {
				if (
					fronteggAuthApiRoutes.indexOf(path) !== -1 ||
					path.endsWith('/postlogin') ||
					path.endsWith('/prelogin') ||
					path === '/oauth/token'
				) {
					return `${props.envAppUrl}/api`;
				} else {
					return props.envBaseUrl;
				}
			},
			clientId: props.envClientId,
		}),
		[ props.envAppUrl, props.envBaseUrl, props.envClientId ]
	);

	const app = useMemo(() => {
		let createdApp;
		const contextOptionsData: FronteggAppOptions['contextOptions'] = {
			requestCredentials: 'include',
			...props.contextOptions,
			...contextOptions,
		}
		const authOptions: FronteggAppOptions['authOptions'] = {
			...props.authOptions,
			onRedirectTo,
			isLoading: false,
			isAuthenticated: !!session,
			hostedLoginBox: hostedLoginBox ?? false,
			disableSilentRefresh: props.authOptions?.disableSilentRefresh ?? true,
			user: user
				? {
					...user,
					accessToken: accessToken ?? '',
					refreshToken: refreshToken ?? undefined,
				}
				: null,
			//@ts-ignore
			tenantsState: tenants ? { tenants, loading: false } : undefined,
		}
		const myStore = createFronteggStore(
			{ context: contextOptionsData },
			storeHolder.current,
			props.previewMode,

			authOptions,
			{
				auth: authOptions ?? {},
				audits: props.auditsOptions ?? {},
			},
			false,
			props.urlStrategy,
		)
		try {
			createdApp = AppHolder.getInstance(appName ?? 'default');
			createdApp.store = myStore;
			console.log('after get', createdApp.store.getState().auth.user?.email, isSSR);
		} catch (e) {
			ContextHolder.setAccessToken(accessToken ?? null);
			ContextHolder.setUser(user ?? null);
			createdApp = initialize(
				{
					...props,
					store: myStore,
					hostedLoginBox: hostedLoginBox ?? false,
					customLoginBox: customLoginBox ?? false,
					basename: props.basename ?? baseName,
					authOptions: {
						...props.authOptions,
						onRedirectTo,
						isLoading: false,
						isAuthenticated: !!session,
						user: user
							? {
								...user,
								accessToken: accessToken ?? '',
								refreshToken: refreshToken ?? undefined,
							}
							: null,
						//@ts-ignore
						tenantsState: tenants ? { tenants, loading: false } : undefined,
					},
					contextOptions: {
						requestCredentials: 'include',
						...props.contextOptions,
						...contextOptions,
					},
					onRedirectTo,
				},
				appName ?? 'default'
			);

			console.log('after init', createdApp.store.getState().auth.user?.email, isSSR);
		}
		return createdApp;
	}, [
		appName,
		props,
		hostedLoginBox,
		baseName,
		onRedirectTo,
		contextOptions,
		customLoginBox,
		user,
		tenants,
		session,
		accessToken,
		refreshToken,
	]);

	ContextHolder.setOnRedirectTo(onRedirectTo);

	if (isSSR) {
		requestAuthorizeSSR({ app, user, tenants, refreshToken, accessToken });
	}

	useEffect(() => {
		requestAuthorizeSSR({ app, user, tenants, refreshToken, accessToken });
	}, [ app ]);

	return (
		<AppContext.Provider value={app}>
			<FronteggStoreProvider {...({ ...props, app } as any)}>
				{props.children}
			</FronteggStoreProvider>
		</AppContext.Provider>
	);
};

const ExpireInListener = () => {
	const user = useAuthUserOrNull();
	const actions = useAuthActions();
	useEffect(() => {
		if (user && user?.expiresIn == null) {
			actions.setUser({
				...user,
				expiresIn: Math.floor(
					((user as any)['exp'] * 1000 - Date.now()) / 1000
				),
			});
		}
	}, [ actions, user ]);
	// eslint-disable-next-line react/jsx-no-useless-fragment
	return <></>;
};
const FronteggNextJSProvider: FC<FronteggProviderProps> = (props) => {
	const router = useRouter();

	return (
		<Connector {...props} router={router}>
			<ExpireInListener/>
			{props.children}
		</Connector>
	);
};

export const FronteggProvider: FC<FronteggProviderProps> = (props) => {
	return (
		<FronteggNextJSProvider {...props} framework={'nextjs'}>
			{props.children}
		</FronteggNextJSProvider>
	);
};
