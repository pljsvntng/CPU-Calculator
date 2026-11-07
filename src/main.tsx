import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/spaceship.css'
import './styles/gantt.css'
import './styles/results.css'
import './styles/learning.css'
import App from './App.tsx'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><BrowserRouter><App /></BrowserRouter></AppErrorBoundary>
  </StrictMode>,
)
