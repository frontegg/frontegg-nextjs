import { createContext } from 'react';
import type { FronteggApp } from '@frontegg/admin-portal/FronteggApp';

const AppContext = createContext<FronteggApp | null>(null);

export default AppContext
