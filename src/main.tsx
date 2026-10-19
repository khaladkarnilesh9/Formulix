import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/premium.css';
import './styles/market-analytics.css';
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')!).render(<BrowserRouter><App /></BrowserRouter>);
