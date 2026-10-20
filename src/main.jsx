import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import AppControls from './shell/AppControls.jsx'
import './theme.css'
import './index.css'
import './studio.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <>
      <nav className="studio-bar" aria-label="Project navigation">
        <a href="https://portfolio-ashy-three-70.vercel.app">Prajjawal / Tools</a>
        <div className="studio-actions">
          <span className="studio-tagline">Made for everyday</span>
          <AppControls />
        </div>
      </nav>
      <App />
    </>
  </React.StrictMode>,
)
