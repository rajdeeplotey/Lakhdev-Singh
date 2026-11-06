import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Flourish } from '../components/Botanical';

export default function NotFound({ message = 'This page could not be found.' }: { message?: string }) {
  return (
    <>
      <Header />
      <main className="notfound" id="main">
        <p className="eyebrow center">A missing page</p>
        <h1>{message}</h1>
        <Flourish className="notfound-flourish" />
        <Link to="/" className="btn">
          Return to the library
        </Link>
      </main>
      <Footer />
    </>
  );
}
