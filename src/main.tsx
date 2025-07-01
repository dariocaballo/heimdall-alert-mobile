
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set app title
document.title = 'ID-Bevakarna - Professionellt Brandskydd';

createRoot(document.getElementById("root")!).render(<App />);
