import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import './mobile-experience.css';
import './member-experience.css';
import './private-club.css';

console.log('Misfits 501 Client Initialized');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
