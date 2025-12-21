import { StrictMode } from 'react'; // Named export from 'react'
import { createRoot } from 'react-dom/client'; // Named export from 'react-dom/client'
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registriert!', reg))
            .catch(err => console.log('SW Fehler:', err));
    });
}