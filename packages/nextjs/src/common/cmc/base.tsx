import { FronteggApp } from '@frontegg/js';
import React, { memo } from 'react';
import { useContext } from 'react';
import { CMCComponentProps } from '@frontegg/types';
import { FC } from 'react';
import { AppContext } from '../..';

export type RenderableFronteggComponent = keyof Pick<
  FronteggApp,
  | 'renderChangePasswordForm'
  | 'renderInviteUserDialog'
  | 'renderProfilePage'
  | 'renderUsersTable'
  | 'renderEditEmailForm'
>;
export type FronteggCMCComponentProps<K extends CMCComponentProps> = Pick<
  K,
  'themeOptions' | 'props' | 'localizations' | 'hostStyle' | 'containerStyle'
>;

export const CMCComponent: FC<
  FronteggCMCComponentProps<CMCComponentProps> & { renderComponent: RenderableFronteggComponent }
> = memo(
  ({ themeOptions, props, localizations, hostStyle, containerStyle, renderComponent }) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const app = useContext(AppContext)!;
    React.useLayoutEffect(() => {
      if (!ref.current) {
        return;
      }
      let rootRendered: { unmount: () => void } = {
        unmount: () => {},
      };

      if (!app[renderComponent]) {
        throw new Error(`Component ${renderComponent} is not supported`);
      }

      app[renderComponent](ref.current, props, {
        themeOptions,
        localizations,
        containerStyle,
      }).then((root) => (rootRendered = root));
    }, []);

    return <div style={{ ...hostStyle }} ref={ref} />;
  },
  () => true
);
