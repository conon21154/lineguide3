import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
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
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  // 개발 환경에서 플랫폼 정보 로깅
  useEffect(() => {
    if (import.meta.env.DEV) {
      logPlatformInfo()
    }
  }, [])

  // 환경에 따른 기본 홈페이지 결정
  const getHomeComponent = () => {
    const mobile = isMobileApp();
    console.log('🏠 Home Component Selection:', {
      isAdmin,
      isMobileApp: mobile,
      selectedComponent: isAdmin ? (mobile ? 'WorkBoard' : 'Dashboard') : 'WorkBoard'
    });
    
    if (isAdmin) {
      // 관리자: 웹에서는 대시보드, 앱에서는 작업게시판
      return mobile ? <WorkBoard /> : <Dashboard />
    } else {
      // 현장팀: 항상 작업게시판
      return <WorkBoard />
    }
  }

  // 로딩 중인 경우
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        !isAuthenticated ? <Navigate to="/login" replace /> : (
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
      } />
    </Routes>
  )
}

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 1000, // 10초
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={3000}
        />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App