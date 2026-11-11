import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/screens/app';
import './ui/styles.css';
import './ui/medieval-hud.css';
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
