import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { API_ENDPOINTS, apiPost, apiGet, AuthToken } from '@/config/api'

interface AuthUser {
  id: number
  username: string
  name: string
  team: string | null
  role: 'admin' | 'team_leader' | 'worker'
  loginTime: string
  stats?: {
    totalWorkOrders: number
    pendingOrders: number
    inProgressOrders: number
    completedOrders: number
  }
}

interface LoginCredentials {
  username: string
  password: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
  isAdmin: boolean
  loading: boolean
  isHydrated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)

  // 토큰으로 사용자 정보 복원
  const initializeAuth = async () => {
    try {
      const token = AuthToken.get()
      console.log('🔑 토큰 확인:', token)
      
      if (!token) {
        console.log('❌ 토큰이 없음')
        setLoading(false)
        return
      }

      console.log('📡 /auth/me 요청 시작')
      const response = await apiGet(API_ENDPOINTS.AUTH.ME)
      console.log('✅ /auth/me 응답:', response)
      
      const userData = response.user
      
      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        team: userData.team,
        role: userData.role,
        loginTime: new Date().toISOString(),
        stats: userData.stats
      }
      
      console.log('👤 사용자 정보 설정:', authUser)
      setUser(authUser)
    } catch (error) {
      console.error('❌ 인증 정보 복원 실패:', error)
      AuthToken.remove()
    } finally {
      setLoading(false)
      // 인증 초기화 완료 후 hydration 상태 설정
      setTimeout(() => setIsHydrated(true), 0)
    }
  }

  useEffect(() => {
    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true)
      
      console.log('🔐 AuthContext login 함수 호출:', credentials.username)
      console.log('🌐 로그인 URL:', API_ENDPOINTS.AUTH.LOGIN)
      console.log('📱 모바일 환경:', navigator.userAgent)
      
      const response = await apiPost(API_ENDPOINTS.AUTH.LOGIN, credentials)
      console.log('✅ 로그인 응답:', response)
      
      // JWT 토큰 저장
      AuthToken.set(response.token)
      console.log('💾 토큰 저장 완료')
      
      // 사용자 정보 설정
      const userData = response.user
      const authUser: AuthUser = {
        id: userData.id,
        username: userData.username,
        name: userData.name,
        team: userData.team,
        role: userData.role,
        loginTime: new Date().toISOString()
      }
      
      console.log('👤 로그인 사용자 정보 설정:', authUser)
      setUser(authUser)
      
      // 로그인 성공 시 hydration 상태도 true로 설정
      setIsHydrated(true)
      
      // 사용자 통계 정보 추가 로드 (임시 비활성화)
      // await refreshUser()
      
    } catch (error) {
      console.error('❌ 로그인 실패:', error)
      AuthToken.remove()
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      // 서버에 로그아웃 요청 (토큰이 있을 때만)
      if (AuthToken.get()) {
        await apiPost(API_ENDPOINTS.AUTH.LOGOUT)
      }
    } catch (error) {
      console.error('로그아웃 요청 실패:', error)
      // 서버 요청 실패해도 클라이언트에서는 로그아웃 처리
    } finally {
      AuthToken.remove()
      setUser(null)
      setIsHydrated(false)
    }
  }

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await apiGet(API_ENDPOINTS.AUTH.ME)
      const userData = response.user
      
      setUser(current => {
        if (!current) return null
        
        return {
          ...current,
          stats: userData.stats
        }
      })
    } catch (error) {
      console.error('사용자 정보 갱신 실패:', error)
      // 토큰이 만료된 경우 로그아웃
      if (error instanceof Error && error.message.includes('401')) {
        await logout()
      }
    }
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading,
    isHydrated
  }

  // 디버깅용 로그
  console.log('🔐 Auth 상태:', {
    user,
    isAuthenticated: !!user,
    loading,
    isHydrated,
    hasToken: !!AuthToken.get()
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}