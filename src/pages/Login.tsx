import { useState } from 'react'
import { Users, LogIn, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
// import { OperationTeam } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

// 로그인 화면에서는 사용하지 않으므로 제거

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  console.log('🎬 Login 컴포넌트 렌더링:', { username, password, loading })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    console.log('🚀 로그인 시도 시작:', { username, password })
    
    if (!username.trim()) {
      setError('사용자명을 입력해주세요.')
      return
    }
    
    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.')
      return
    }
    
    try {
      await login({
        username: username.trim(),
        password: password.trim()
      })
      
      // 로그인 성공 후 리다이렉트
      console.log('🎉 로그인 성공, 메인 페이지로 이동')
      // GitHub Pages 환경에서 안전한 리다이렉트
      const basePath = import.meta.env.BASE_URL || '/';
      navigate(basePath === '/' ? '/' : '/lineguide3/', { replace: true })
      
    } catch (error) {
      console.error('로그인 실패:', error)
      setError(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4 touch-manipulation">
      <div className="max-w-md w-full mx-2">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-8">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              LineGuide 3 시스템
            </h1>
            <p className="text-gray-600">
              사용자명과 비밀번호를 입력하여 로그인하세요
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* 사용자명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용자명
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input w-full text-base"
                placeholder="사용자명을 입력하세요"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full text-base"
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck="false"
                required
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-12 text-base"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* 도움말 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 text-center">
              <p><strong>기본 계정:</strong></p>
              <p>• 관리자: admin / admin123</p>
              <p>• A팀 리더: leader_a / leader123</p>
              <p>• 작업자: worker_a1 / worker123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}