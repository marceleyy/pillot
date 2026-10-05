// ═══════════════════════════════════════════════════════════════
//  PILLOT — Point d'entrée
//  Fichier : src/main.jsx
//  Remplace le contenu existant
// ═══════════════════════════════════════════════════════════════

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Police hébergée avec l'appli (pas d'appel à Google Fonts)
import '@fontsource-variable/inter'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
