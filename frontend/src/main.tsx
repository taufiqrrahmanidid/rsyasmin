import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDeviceEnvironmentAndFontNormalization } from './utils/deviceDetector';

// Initialize background OS, Browser, Screen Resolution check & Font Normalization script
initDeviceEnvironmentAndFontNormalization();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
