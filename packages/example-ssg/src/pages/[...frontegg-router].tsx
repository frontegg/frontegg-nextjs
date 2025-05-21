import { FronteggRouter } from '@frontegg/nextjs/pages';

export const getStaticProps = () => {
  return{
    props:{}
  }
}

export const getStaticPaths = (async () => {
  return {
    paths: ["/account/login", "/account/sign-up", "/account/forgot-password", "/account/reset-password", '/account/logout'],
    fallback: false, // false or "blocking"
  }
})

export default FronteggRouter;
