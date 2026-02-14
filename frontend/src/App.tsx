import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Layout } from './layout'
import { Home } from './views/Home'
import { Profile } from './views/Profile'
import { Settings } from './views/Settings'
import { BatchEvaluation } from './views/BatchEvaluation'
import { CognitionProvider } from './context/CognitionContext'

function App() {

  const [view, setView] = useState('home')

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <CognitionProvider>
        <Layout view={view} setView={setView}>
          <Home id="home" label="Home" />
          <BatchEvaluation id="batch-eval" label="Batch Evaluation" />
          <Profile id="profile" label="Profile" />
          <Settings id="settings" label="Settings" />
        </Layout>
      </CognitionProvider>
    </div>
  )
}

export default App
