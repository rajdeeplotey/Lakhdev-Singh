import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/home.css';
import './styles/pages.css';
import './styles/mobile-hero.css';
import './styles/desktop-hero.css';
import './styles/author.css';
import './styles/i18n.css';
import './styles/books.css';
import './styles/logo-tones.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
