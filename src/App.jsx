import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ChatPage from './pages/ChatPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ManagePage from './pages/ManagePage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/manage" element={<ManagePage />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Route>
    </Routes>
  )
}
