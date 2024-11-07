'use client';
import {
  useAuthActions,
  useAuthUserOrNull,
  useLoginWithRedirect,
  AdminPortal,
  useLogoutHostedLogin,
} from '@frontegg/nextjs';
import Link from 'next/link';

export const UserState = () => {
  const user = useAuthUserOrNull();
  const loginWithRedirect = useLoginWithRedirect();
  const logoutHosted = useLogoutHostedLogin();
  const { switchTenant } = useAuthActions();

  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return (
    <div>
      <div>{user?.email ?? 'not logged in'}</div>

      <br />
      <br />
      <div>
        <h2>Tenants:</h2>
        {(user?.tenants ?? []).map((tenant) => {
          return (
            <div key={tenant.tenantId}>
              <b>Tenant Id:</b>
              {tenant['tenantId']}
              <span style={{ display: 'inline-block', width: '20px' }} />
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
      <br />
      <button
        onClick={() => {
          AdminPortal.show();
        }}
      >
        Open AdminPortal
      </button>
      <br />
      <button
        onClick={() => {
          loginWithRedirect();
        }}
      >
        Open hosted login
      </button>
      <br />
      <button
        onClick={() => {
          logoutHosted();
        }}
      >
        logout hosted login
      </button>
      <br />
      <br />
    </div>
  );
};
