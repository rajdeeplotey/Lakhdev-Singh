import { Hero } from '../sections/Hero';
import { LatestRelease } from '../sections/LatestRelease';
import { Collection } from '../sections/Collection';
import { About } from '../sections/About';
import { ReadListen } from '../sections/ReadListen';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export default function Home() {
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <LatestRelease />
        <Collection />
        <About />
        <ReadListen />
      </main>
      <Footer />
    </>
  );
}
