import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './firebase' // Initialize Firebase
import { initializeStorage } from './modules/storage' // Initialize storage adapters

// Initialize storage with default adapters
initializeStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
