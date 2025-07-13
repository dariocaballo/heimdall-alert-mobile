
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorker, requestNotificationPermission } from './utils/serviceWorker'

// Set app title
document.title = 'ID-Bevakarna - Professionellt Brandskydd';

// Initialize service workers and notifications when app starts
const initializeApp = async () => {
  try {
    // Register service workers
    await registerServiceWorker();
    
    // Request notification permission
    const permissionGranted = await requestNotificationPermission();
    if (permissionGranted) {
      console.log('Notifikationstillstånd beviljat');
    } else {
      console.log('Notifikationstillstånd nekad');
    }
  } catch (error) {
    console.error('Fel vid initialisering av app:', error);
  }
};

// Initialize app
initializeApp();

createRoot(document.getElementById("root")!).render(<App />);
