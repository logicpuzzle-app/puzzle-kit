import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PlayerApp from './PlayerApp.tsx'
import EditApp from './EditApp.tsx'
import HomeApp from './HomeApp.tsx'
import './firebase' // Initialize Firebase
import { initializeStorage } from './modules/storage' // Initialize storage adapters

// Initialize storage with default adapters
initializeStorage();

const path = window.location.pathname;
let RootApp = HomeApp;
if (path.startsWith('/play')) {
  RootApp = PlayerApp;
} else if (path.startsWith('/edit')) {
  RootApp = EditApp;
} else if (path.startsWith('/master')) {
  RootApp = App;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
)
