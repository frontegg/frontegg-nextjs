import {
  AdminPortal,
  ChangePasswordForm,
  EditEmailForm,
  InviteUserDialog,
  ProfilePage,
  useAuth,
  useInviteUserDialog,
  UsersTable,
  useUsersTable,
} from '@frontegg/nextjs';
import Link from 'next/link';
import { AppHolder } from '@frontegg/js/AppHolder';
import { useEffect, useState } from 'react';
import Loader from '../components/loader';
import Testing from '../components/Testing';

export default function SsgPage1() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // get the frontegg app instance // import { AppHolder } from '@frontegg/js/AppHolder';
  const app = AppHolder.getInstance('default');
  const [appLoading, setLoading] = useState(app.loading);

  const { openDialog: openInviteUserDialog } = useInviteUserDialog();
  const { onSearch } = useUsersTable();
  // console.log({ appLoading, isLoading, isAuthenticated, app })
  useEffect(() => {
    // single time load listener that trigger when the login-box cdn js files is loaded
    app.addOnLoadedListener(() => {
      console.log('App loaded');
      setLoading(false);
    });
  }, [app]);

  // detect SSG build time and render content as should be with optional user object
  // this is important to avoid the loader to be pre-rendered in all in SSG pages
  const isBuildTime = process.env.NEXT_PHASE == 'phase-production-build';

  // check if the app is loading
  if (!isBuildTime && (isLoading || appLoading)) {
    return (
      <>
        <Loader />
      </>
    );
  } else {
    console.log('Loaded', { user, isAuthenticated });
  }

  /**
   * refreshingToken is true when the token is being refreshed.
   * this will be added to the useAuth hook in the next release.
   *
   * Then you can use it to display a loading spinner or something like that,
   * while the token is being refreshed on component mounts.
   */
  // const { user, refreshingToken } = useAuth();

  return (
    <div style={{ background: '#c2f2f8', padding: '16px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        components examples
        <button
          onClick={() => {
            openInviteUserDialog();
          }}
        >
          Open invite user dialog
        </button>
        <input
          type='text'
          onChange={(e) => {
            onSearch(e.target.value);
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <UsersTable
            props={{}}
            themeOptions={{
              adminPortal: {
                components: {
                  MuiTableCell: {
                    styleOverrides: {
                      head: {
                        background: 'lightgreen',
                        border: '1px solid red',
                      },
                      body: {
                        background: 'pink',
                        border: '1px solid red',
                      },
                    },
                  },
                },
              },
            }}
            hostStyle={{ width: '100%', height: '450px', marginBottom: '50px' }}
          />
          <ProfilePage
            props={{}}
            containerStyle={{ border: '1px solid red' }}
            hostStyle={{ width: '100%', height: '350px', marginBottom: '50px' }}
          />
          <ChangePasswordForm props={{}} hostStyle={{ width: '100%', height: '150px', marginBottom: '50px' }} />
          <InviteUserDialog props={{}} hostStyle={{ width: '100%', height: '0px', marginBottom: '50px' }} />
          <EditEmailForm props={{}} containerStyle={{ border: '1px solid blue' }} />
        </div>
      </div>
      <Testing />
      <h1 style={{ marginBottom: '32px' }}>SSG Page 1</h1>
      {user ? <div>Logged in as: {user.email}</div> : <div>SSG not authorized</div>}
      <br />
      <br />
      <Link href='/ssg-page-2'>
        <button>Go to SSG page 2</button>
      </Link>
      <br />
      <Link href='/'>
        <button>Go home page (SSR)</button>
      </Link>
      <br />
      <br />
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>
    </div>
  );
}

export const getStaticProps = () => ({ props: {} });
