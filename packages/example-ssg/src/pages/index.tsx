import Link from 'next/link';
import { AdminPortal, useAuth, useAuthActions } from '@frontegg/nextjs';
// import { AppHolder } from '@frontegg/js/AppHolder';
// import { useEffect, useState } from 'react';
// import Loader from '@/components/loader';


export function Index() {
  const { switchTenant } = useAuthActions();

  const { user, isAuthenticated } = useAuth();

  // // get the frontegg app instance // import { AppHolder } from '@frontegg/js/AppHolder';
  // const app = AppHolder.getInstance('default')
  // const [ appLoading, setLoading ] = useState(true);
  //
  // console.log({appLoading, isLoading, isAuthenticated})
  // useEffect(() => {
  //   // single time load listener that trigger when the login-box cdn js files is loaded
  //   app.addOnLoadedListener(() => {
  //     console.log('App loaded');
  //     setLoading(false)
  //   })
  // }, [ app ])


  // // detect SSG build time and render content as should be with optional user object
  // // this is important to avoid the loader to be pre-rendered in all in SSG pages
  // const isBuildTime = process.env.NEXT_PHASE == 'phase-production-build'
  //
  // // check if the app is loading
  // if (!isBuildTime && (isLoading || appLoading)) {
  //   return <Loader/>
  // } else {
  //   console.log('Loaded', { user, isAuthenticated });
  // }

  return (
    <div>
      <h2>Home Page</h2>
      <h3>NextJS 15 {'<->'} Frontegg with SSG support</h3>
      <br/>
      <br/>

      {isAuthenticated ? <Link href="/account/logout">
          <button className="red">Logout</button>
        </Link> :
        <Link href={'/account/login'}>
          <button>Login</button>
        </Link>}

      <br/>
      <br/>
      {isAuthenticated && <>
        <div>
          <b>Logged In: </b> {user?.email}
        </div>
        <br/>
        <button onClick={() => AdminPortal.show()}>
          Open AdminPortal
        </button>

        <br/>
        <br/>

        <div>
          <h2>Tenants:</h2>
          <br/>
          {(user?.tenants ?? []).map((tenant) => {
            return (
              <div key={tenant.tenantId} style={{ height: '40px' }}>
                <b>Tenant Id:</b>
                {tenant['tenantId']}
                <span style={{ display: 'inline-block', width: '20px' }}/>
                {tenant.tenantId === user?.tenantId ? (
                  <b>Current Tenant</b>
                ) : (
                  <button
                    onClick={() => {
                      switchTenant({ tenantId: tenant.tenantId });
                    }}
                  >
                    Switch to tenant
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </>}

      <br/>
      <Link href="/ssg-page-1">
        <button>Go to SSG page 1</button>
      </Link>
      <Link href="/ssg-page-2">
        <button>Go to SSG page 2</button>
      </Link>
      <br/>
      <br/>
    </div>
  );
}

export default Index;
export const getStaticProps = () => ({ props: {} });
