import { StrictMode } from 'react'; // Named export from 'react'
import { createRoot } from 'react-dom/client'; // Named export from 'react-dom/client'
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);