import { useState, useEffect } from 'react'
import { User, Lock, LogIn, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { KtMosLogo } from '@/components/common/KtMosLogo'

export default function Login() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [capsLockOn, setCapsLockOn] = useState(false)
  
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  console.log('🎬 Login 컴포넌트 렌더링:', { username, password, loading })

  // CapsLock 감지
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState('CapsLock'))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setCapsLockOn(e.getModifierState('CapsLock'))
    }

    document.addEventListener('keypress', handleKeyPress)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keypress', handleKeyPress)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

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

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-slate-100 flex flex-col">
      {/* 상단 고정 헤더 */}
      <header className="bg-gradient-to-r from-[#1E40AF] via-[#1E3A8A] to-[#1E40AF] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <KtMosLogo className="text-white" size="md" />
              <div className="text-[22px] sm:text-[26px] font-black tracking-tight text-white">
                LineGuide
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md sm:max-w-lg">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8">
            {/* 카드 헤더 */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                시스템 로그인
              </h1>
              <p className="text-slate-600 text-sm sm:text-base">
                5G MUX 구축 통합 플랫폼에 로그인하세요
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* 에러 메시지 */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              {/* CapsLock 경고 */}
              {capsLockOn && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="text-sm text-amber-700">CapsLock이 켜져 있습니다</p>
                </div>
              )}

              {/* 사용자명 입력 */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-semibold text-slate-700">
                  사용자명
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/70 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm text-base"
                    placeholder="사용자명을 입력하세요"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    aria-label="사용자명"
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-white/70 border border-slate-300 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm text-base"
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    spellCheck="false"
                    required
                    aria-label="비밀번호"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* 자동 로그인 체크박스 */}
              <div className="flex items-center gap-3">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="rememberMe" className="text-sm text-slate-700 cursor-pointer">
                  자동 로그인 (기억하기)
                </label>
              </div>

              {/* 로그인 버튼 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 min-h-12 text-base flex items-center justify-center gap-2"
                aria-label={loading ? '로그인 중' : '로그인'}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>로그인 중...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>로그인</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}