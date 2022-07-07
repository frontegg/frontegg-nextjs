import Link from 'next/link';

export function Index() {
  /*
   * Replace the elements below with your own.
   *
   * Note: The corresponding styles are in the ./index.css file.
   */
  return <div>
    Next JS application with frontegg
    <br/>
    <br/>
    <Link href="/force-session">
      check force session
    </Link>
  </div>
    ;
}

export default Index;
