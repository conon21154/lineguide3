import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import WorkBoard from '@/pages/WorkBoard'
import LabelPrinter from '@/pages/LabelPrinter'
import Board from '@/pages/Board'
import Login from '@/pages/Login'
import { isMobileApp, logPlatformInfo } from '@/utils/platformDetection'
import { useEffect } from 'react'

function AppContent() {
  const { isAuthenticated, isAdmin, login } = useAuth()

  // 개발 환경에서 플랫폼 정보 로깅
  useEffect(() => {
    if (import.meta.env.DEV) {
      logPlatformInfo()
    }
  }, [])

  if (!isAuthenticated) {
    return <Login onLogin={login} />
  }

  // 환경에 따른 기본 홈페이지 결정
  const getHomeComponent = () => {
    if (isAdmin) {
      // 관리자: 웹에서는 대시보드, 앱에서는 작업게시판
      return isMobileApp() ? <WorkBoard /> : <Dashboard />
    } else {
      // 현장팀: 항상 작업게시판
      return <WorkBoard />
    }
  }

  return (
    <Layout>
      <Routes>
        {isAdmin ? (
          // 관리자 전체 메뉴
          <>
            <Route path="/" element={getHomeComponent()} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/workboard" element={<WorkBoard />} />
            <Route path="/label-printer" element={<LabelPrinter />} />
            <Route path="/board" element={<Board />} />
          </>
        ) : (
          // 현장팀 제한 메뉴
          <>
            <Route path="/" element={<WorkBoard />} />
            <Route path="/workboard" element={<WorkBoard />} />
            <Route path="/label-printer" element={<LabelPrinter />} />
            <Route path="/board" element={<Board />} />
            {/* 현장팀이 대시보드 접근 시 작업게시판으로 리다이렉트 */}
            <Route path="/dashboard" element={<Navigate to="/workboard" replace />} />
            <Route path="/upload" element={<Navigate to="/workboard" replace />} />
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