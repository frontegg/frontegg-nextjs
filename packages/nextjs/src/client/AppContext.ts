import { createContext } from 'react';
import type { FronteggApp } from '@frontegg/js';

const AppContext = createContext<FronteggApp | null>(null);

export default AppContext;
