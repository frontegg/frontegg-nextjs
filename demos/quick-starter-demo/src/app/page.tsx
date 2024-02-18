import Image from 'next/image';
import styles from './page.module.css';
import { AdminPortalButton } from './AdminPortal';
import { UserState } from './UserState';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <p>
          <UserState />
        </p>
        <div>
          <a href='https://portal.frontegg.com/' target='_blank' rel='noopener noreferrer'>
            <Image
              src='/frontegg.svg'
              alt='Vercel Logo'
              className={styles.vercelLogo}
              width={100}
              height={24}
              priority
            />
          </a>
        </div>
      </div>

      <div className={styles.center}>
        <Image className={styles.logo} src='/next.svg' alt='Next.js Logo' width={180} height={37} priority />
      </div>

      <div className={styles.grid}>
        <a
          href='https://docs.frontegg.com/docs/authentication-features'
          className={styles.card}
          target='_blank'
          rel='noopener noreferrer'
        >
          <h2>
            Authentication <span>-&gt;</span>
          </h2>
          <p>Easily handle complicated authentication flows</p>
        </a>

        <AdminPortalButton />

        <a
          href='https://docs.frontegg.com/docs/user-management'
          className={styles.card}
          target='_blank'
          rel='noopener noreferrer'
        >
          <h2>
            Management <span>-&gt;</span>
          </h2>
          <p>Control accounts and users with Frontegg backoffice.</p>
        </a>

        <a
          href='https://docs.frontegg.com/docs/entitlements-features'
          className={styles.card}
          target='_blank'
          rel='noopener noreferrer'
        >
          <h2>
            Authorization <span>-&gt;</span>
          </h2>
          <p>Utilize advanced authorization for application access management.</p>
        </a>
      </div>
    </main>
  );
}
