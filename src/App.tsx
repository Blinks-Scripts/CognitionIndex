import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Layout } from './layout'
import { Home } from './views/Home'
import { Profile } from './views/Profile'
import { Settings } from './views/Settings'

function App() {

  const [view, setView] = useState('home')

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Layout view={view} setView={setView}>
        <Home id="home" label="Home" />
        <Profile id="profile" label="Profile" />
        <Settings id="settings" label="Settings" />
      </Layout>
    </div>
  )
}

export default App
