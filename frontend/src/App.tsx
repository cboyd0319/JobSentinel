import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Jobs } from './pages/Jobs'
import { Tracker } from './pages/Tracker'
import { Resume } from './pages/Resume'
import { LLMFeatures } from './pages/LLMFeatures'
import { Settings } from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="resume" element={<Resume />} />
        <Route path="llm" element={<LLMFeatures />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

export default App
