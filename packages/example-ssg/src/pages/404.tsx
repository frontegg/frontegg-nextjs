export default function Custom404() {

  // const { isLoading } = useAuth();
  // if (isLoading || (typeof window !== 'undefined' && isAuthRoute(window.location.pathname))) {
  //   // This is a private routes for frontegg, we don't want to show 404 page
  //   // in the next
  //   return <></>
  // }

  // console.log(typeof window !== 'undefined' && window.location.pathname)
  return <h1>404 - Page Not Found</h1>
}

export const getStaticProps = () => ({ props: {} });
