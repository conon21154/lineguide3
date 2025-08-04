import { Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import WorkBoard from '@/pages/WorkBoard'
import LabelPrinter from '@/pages/LabelPrinter'
import Login from '@/pages/Login'

function AppContent() {
  const { isAuthenticated, isAdmin, login } = useAuth()

  if (!isAuthenticated) {
    return <Login onLogin={login} />
  }

  return (
    <Layout>
      <Routes>
        {isAdmin ? (
          // 관리자 전체 메뉴
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/workboard" element={<WorkBoard />} />
            <Route path="/label-printer" element={<LabelPrinter />} />
          </>
        ) : (
          // 현장팀 제한 메뉴
          <>
            <Route path="/" element={<WorkBoard />} />
            <Route path="/workboard" element={<WorkBoard />} />
            <Route path="/label-printer" element={<LabelPrinter />} />
          </>
        )}
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App