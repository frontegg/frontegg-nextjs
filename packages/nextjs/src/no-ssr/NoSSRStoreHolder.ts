import { FronteggStore } from '@frontegg/redux-store';

class NoSSRStoreHolder {
  private static instance: NoSSRStoreHolder | null = null;
  store?: FronteggStore;

  private constructor() {}

  public static getInstance(): NoSSRStoreHolder {
    if (NoSSRStoreHolder.instance === null) {
      NoSSRStoreHolder.instance = new NoSSRStoreHolder();
    }
    return NoSSRStoreHolder.instance;
  }
}

export default NoSSRStoreHolder;
