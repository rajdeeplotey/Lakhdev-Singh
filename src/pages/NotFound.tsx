import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Flourish } from '../components/Botanical';
import { useT } from '../i18n';

export default function NotFound({ message }: { message?: string }) {
  const t = useT();
  return (
    <>
      <Header />
      <main className="notfound" id="main">
        <p className="eyebrow center">{t.notFound.eyebrow}</p>
        <h1>{message ?? t.notFound.page}</h1>
        <Flourish className="notfound-flourish" />
        <Link to="/" className="btn">
          {t.notFound.back}
        </Link>
      </main>
      <Footer />
    </>
  );
}
