import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act, createContext } from 'react';
import { createRoot, Root } from 'react-dom/client';

const AppContext = vi.hoisted(() => ({ current: null as any }));

vi.mock('../../../src/common/AppContext', async () => {
  const react = await import('react');
  AppContext.current = react.createContext(null);
  return { default: AppContext.current };
});
vi.mock('@frontegg/react-hooks', () => ({ useSnapshot: (state: any) => state }));
vi.mock('@frontegg/redux-store', () => ({ createProxy: (state: any) => state }));

import { useInviteUserDialog, useUsersTable } from '../../../src/common/cmc/hooks';
import {
  ChangePasswordForm,
  EditEmailForm,
  InviteUserDialog,
  ProfilePage,
  UsersTable,
} from '../../../src/common/cmc/components';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

const render = async (element: React.ReactElement, app: any) => {
  const Provider = (AppContext.current as ReturnType<typeof createContext>).Provider;
  await act(async () => {
    root.render(<Provider value={app}>{element}</Provider>);
  });
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('useUsersTable', () => {
  it('returns an idle default store until the app store resolves, then the app store', async () => {
    // Arrange
    const store = deferred<any>();
    const app = { getUsersTableStore: vi.fn(() => store.promise) };
    const snapshots: any[] = [];
    const Probe = () => {
      snapshots.push(useUsersTable('table-1'));
      return null;
    };

    // Act
    await render(<Probe />, app);
    const initial = snapshots[snapshots.length - 1];
    await act(async () => store.resolve({ searchQuery: 'bob', searching: true }));

    // Assert
    expect(app.getUsersTableStore).toHaveBeenCalledWith({ id: 'table-1' });
    expect(initial).toMatchObject({ searchQuery: '', searching: false });
    expect(initial.onSearch()).toBeUndefined();
    expect(snapshots[snapshots.length - 1]).toEqual({ searchQuery: 'bob', searching: true });
  });

  it('keeps the default store and logs when the app store fails', async () => {
    // Arrange
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('not ready');
    const app = { getUsersTableStore: vi.fn(() => Promise.reject(error)) };
    let snapshot: any;
    const Probe = () => {
      snapshot = useUsersTable();
      return null;
    };

    // Act
    await render(<Probe />, app);

    // Assert
    expect(consoleError).toHaveBeenCalledWith('Error getting users table store', error);
    expect(snapshot).toMatchObject({ searchQuery: '', searching: false });
  });
});

describe('useInviteUserDialog', () => {
  it('returns a closed default dialog until the app store resolves, then the app store', async () => {
    // Arrange
    const appStore = { dialogOpen: true, openDialog: vi.fn(), closeDialog: vi.fn() };
    const app = { getInviteUserDialogStore: vi.fn(() => Promise.resolve(appStore)) };
    const snapshots: any[] = [];
    const Probe = () => {
      snapshots.push(useInviteUserDialog('dialog-1'));
      return null;
    };

    // Act
    await render(<Probe />, app);

    // Assert
    expect(app.getInviteUserDialogStore).toHaveBeenCalledWith({ id: 'dialog-1' });
    expect(snapshots[0]).toMatchObject({ dialogOpen: false });
    expect(snapshots[0].openDialog()).toBeUndefined();
    expect(snapshots[0].closeDialog()).toBeUndefined();
    expect(snapshots[snapshots.length - 1]).toBe(appStore);
  });

  it('keeps the default dialog and logs when the app store fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('not ready');
    const app = { getInviteUserDialogStore: vi.fn(() => Promise.reject(error)) };
    let snapshot: any;
    const Probe = () => {
      snapshot = useInviteUserDialog();
      return null;
    };

    await render(<Probe />, app);

    expect(consoleError).toHaveBeenCalledWith('Error getting invite user dialog store', error);
    expect(snapshot).toMatchObject({ dialogOpen: false });
  });
});

describe('CMC components', () => {
  it.each([
    [UsersTable, 'renderUsersTable'],
    [InviteUserDialog, 'renderInviteUserDialog'],
    [ChangePasswordForm, 'renderChangePasswordForm'],
    [ProfilePage, 'renderProfilePage'],
    [EditEmailForm, 'renderEditEmailForm'],
  ] as const)('%o renders through app.%s into a styled host element', async (Component: any, renderer) => {
    // Arrange
    const app = { [renderer]: vi.fn(async () => ({ unmount: vi.fn() })) };
    const props = { id: 'x' };
    const themeOptions = { palette: {} };
    const localizations = { en: {} };
    const containerStyle = { padding: 1 };

    // Act
    await render(
      <Component
        props={props}
        themeOptions={themeOptions}
        localizations={localizations}
        containerStyle={containerStyle}
        hostStyle={{ width: '10px' }}
      />,
      app
    );

    // Assert
    const host = container.firstElementChild as HTMLDivElement;
    expect(host.style.width).toBe('10px');
    expect(app[renderer]).toHaveBeenCalledWith(host, props, { themeOptions, localizations, containerStyle });
  });

  it('renders the host once and ignores later prop changes', async () => {
    const app = { renderUsersTable: vi.fn(async () => ({ unmount: vi.fn() })) };

    await render(<UsersTable props={{ a: 1 } as any} />, app);
    await render(<UsersTable props={{ a: 2 } as any} />, app);

    expect(app.renderUsersTable).toHaveBeenCalledTimes(1);
  });

  it('fails loudly when the app does not support the component', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(render(<UsersTable {...({} as any)} />, {})).rejects.toThrow(
      'Component renderUsersTable is not supported'
    );
  });
});
