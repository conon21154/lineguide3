import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Clipboard, Clock, ChevronLeft, ChevronRight, Printer, LogOut, User, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAuth } from '@/contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

const adminNavigation = [
  { name: '대시보드', href: '/', icon: BarChart3 },
  { name: '작업지시 업로드', href: '/upload', icon: Upload },
  { name: '작업게시판', href: '/workboard', icon: Clipboard },
  { name: '라벨 프린터', href: '/label-printer', icon: Printer },
]

const fieldNavigation = [
  { name: '작업게시판', href: '/workboard', icon: Clipboard },
  { name: '라벨 프린터', href: '/label-printer', icon: Printer },
]

const RecentWorkOrdersSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const { workOrders } = useWorkOrders()
  const recentWorkOrders = workOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-80'} bg-white border-l border-gray-200 transition-all duration-300 ease-in-out`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">최근 업로드</h3>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
        
        {!isCollapsed && (
          <>
            {recentWorkOrders.length > 0 ? (
              <div className="space-y-3">
                {recentWorkOrders.map((workOrder) => (
                  <div key={workOrder.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {workOrder.equipmentName}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {workOrder.operationTeam} • {workOrder.requestDate}
                    </div>
                    <div className="text-xs font-mono text-gray-400 mt-1 truncate">
                      {workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        workOrder.status === 'pending' 
                          ? 'bg-warning-100 text-warning-800'
                          : workOrder.status === 'in_progress'
                          ? 'bg-primary-100 text-primary-800'
                          : 'bg-success-100 text-success-800'
                      }`}>
                        {workOrder.status === 'pending' ? '대기' : 
                         workOrder.status === 'in_progress' ? '진행중' : '완료'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">업로드된 작업지시가 없습니다</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isAdmin } = useAuth()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const navigation = isAdmin ? adminNavigation : fieldNavigation

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">LineGuide</h1>
              <span className="hidden sm:inline ml-2 text-sm text-gray-500">
                KT 통신장비 유지보수 관리
              </span>
            </div>

            {/* 데스크톱 네비게이션 */}
            <div className="hidden sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium',
                      isActive
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* 사용자 정보 및 모바일 메뉴 */}
            <div className="flex items-center space-x-4">
              {/* 사용자 정보 */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-medium">
                  {user?.team} {user?.userType === 'admin' ? '관리자' : '현장팀'}
                </span>
              </div>
              
              {/* 로그아웃 버튼 */}
              <button
                onClick={logout}
                className="hidden sm:flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>

              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* 모바일 메뉴 */}
          {mobileMenuOpen && (
            <div className="sm:hidden border-t border-gray-200 py-2">
              <div className="flex flex-col space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={clsx(
                        'flex items-center px-4 py-3 text-base font-medium rounded-md',
                        isActive
                          ? 'bg-primary-50 border-primary-500 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </Link>
                  )
                })}
                
                {/* 모바일 사용자 정보 및 로그아웃 */}
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-4 py-2 text-sm text-gray-500">
                    <User className="w-4 h-4 inline mr-2" />
                    {user?.team} {user?.userType === 'admin' ? '관리자' : '현장팀'}
                  </div>
                  <button
                    onClick={() => {
                      logout()
                      setMobileMenuOpen(false)
                    }}
                    className="flex items-center w-full px-4 py-3 text-base font-medium text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="flex">
        <main className={`flex-1 py-2 sm:py-6 px-2 sm:px-6 lg:px-8 transition-all duration-300 ${
          location.pathname === '/' 
            ? sidebarCollapsed 
              ? 'max-w-7xl mx-auto' 
              : 'max-w-5xl mx-auto'
            : 'max-w-7xl mx-auto'
        }`}>
          <div className="py-2 sm:py-6">
            {children}
          </div>
        </main>
        
        {location.pathname === '/' && (
          <RecentWorkOrdersSidebar 
            isCollapsed={sidebarCollapsed} 
            onToggle={toggleSidebar} 
          />
        )}
      </div>
    </div>
  )
}