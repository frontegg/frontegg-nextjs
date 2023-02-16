import { useCallback } from 'react';
import { RedirectOptions } from '@frontegg/rest-api';
import type { NextRouter } from 'next/router';

const useOnRedirectTo = (baseName: string, router: NextRouter) => {
  return useCallback((_path: string, opts?: RedirectOptions) => {
    const isSSR = typeof window == undefined;
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
};

export default useOnRedirectTo;
