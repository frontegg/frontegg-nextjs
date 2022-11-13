import { unsealData } from 'iron-session';
import { jwtVerify } from 'jose';
import { ReadonlyRequestCookies } from 'next/dist/server/app-render';
import fronteggConfig from '../common/FronteggConfig';
import { uncompress } from '../common/helpers';
import { FronteggNextJSSession } from '../common/types';

export async function getSessionFromCookies(
    cookies: () => ReadonlyRequestCookies
): Promise<FronteggNextJSSession | undefined> {
    try {
        const cookie = cookies().get(fronteggConfig.cookieName);
        if (!cookie) {
            return undefined;
        }
        const { value: cookieValue } = cookie
        const compressedJwt: string = await unsealData(cookieValue, {
            password: fronteggConfig.passwordsAsMap,
        });
        const uncompressedJwt = await uncompress(compressedJwt);
        const { accessToken, refreshToken } = JSON.parse(uncompressedJwt);

        if (!accessToken) {
            return undefined;
        }
        const publicKey = await fronteggConfig.getJwtPublicKey();
        const { payload }: any = await jwtVerify(accessToken, publicKey);

        const session: FronteggNextJSSession = {
            accessToken,
            user: payload,
            refreshToken,
        };
        if (session.user.exp * 1000 < Date.now()) {
            return undefined;
        }
        return session;
    } catch (e) {
        console.error(e);
        return undefined;
    }
}