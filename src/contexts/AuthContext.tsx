import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { OperationTeam } from '@/types'

interface AuthUser {
  team: OperationTeam
  userType: 'admin' | 'field'
  loginTime: string
}

interface AuthContextType {
  user: AuthUser | null
  login: (team: OperationTeam, userType: 'admin' | 'field') => void
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'auth_user'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)

  // 로컬스토리지에서 인증 정보 복원
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (stored) {
        const authUser = JSON.parse(stored) as AuthUser
        setUser(authUser)
      }
    } catch (error) {
      console.error('인증 정보 복원 실패:', error)
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
  }, [])

  const login = (team: OperationTeam, userType: 'admin' | 'field') => {
    const authUser: AuthUser = {
      team,
      userType,
      loginTime: new Date().toISOString()
    }
    
    setUser(authUser)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.userType === 'admin'
  }

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