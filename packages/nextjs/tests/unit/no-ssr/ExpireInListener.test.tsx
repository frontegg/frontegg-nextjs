import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';

vi.mock('@frontegg/react-hooks', () => ({ useAuthUserOrNull: vi.fn(), useAuthActions: vi.fn() }));
vi.mock('../../../src/utils/common', () => ({ calculateExpiresInFromExp: vi.fn((exp: number) => exp - 1000) }));

import { useAuthActions, useAuthUserOrNull } from '@frontegg/react-hooks';
import ExpireInListener from '../../../src/no-ssr/ExpireInListener';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const actions = { setUser: vi.fn() };
let root: Root;

const renderWithUser = async (user: Record<string, any> | null) => {
  vi.mocked(useAuthUserOrNull).mockReturnValue(user as any);
  await act(async () => root.render(<ExpireInListener />));
};

beforeEach(() => {
  vi.mocked(useAuthActions).mockReturnValue(actions as any);
  root = createRoot(document.createElement('div'));
});

afterEach(async () => {
  await act(async () => root.unmount());
});

describe('ExpireInListener', () => {
  it('derives expiresIn from the jwt exp claim when the user lacks it', async () => {
    await renderWithUser({ id: 'u', exp: 5000 });

    expect(actions.setUser).toHaveBeenCalledWith({ id: 'u', exp: 5000, expiresIn: 4000 });
  });

  it('leaves a user that already has expiresIn untouched', async () => {
    await renderWithUser({ id: 'u', exp: 5000, expiresIn: 10 });

    expect(actions.setUser).not.toHaveBeenCalled();
  });

  it('does nothing without a logged in user', async () => {
    await renderWithUser(null);

    expect(actions.setUser).not.toHaveBeenCalled();
  });
});
