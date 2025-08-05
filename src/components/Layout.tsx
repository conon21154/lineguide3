import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Clipboard, Clock, ChevronLeft, ChevronRight, Printer, LogOut, User, Menu, X, MessageSquare } from 'lucide-react'
import clsx from 'clsx'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAuth } from '@/contexts/AuthContext'
import { isMobileApp } from '@/utils/platformDetection'

interface LayoutProps {
  children: ReactNode
}

// 환경에 따른 네비게이션 구성
const getNavigationItems = (isAdmin: boolean, isMobile: boolean) => {
  if (isAdmin) {
    if (isMobile) {
      // 관리자 모바일 앱: 작업게시판 중심
      return [
        { name: '작업게시판', href: '/', icon: Clipboard },
        { name: '대시보드', href: '/dashboard', icon: BarChart3 },
        { name: '작업지시 업로드', href: '/upload', icon: Upload },
        { name: '라벨 프린터', href: '/label-printer', icon: Printer },
        { name: '현장 회신', href: '/board', icon: MessageSquare },
      ]
    } else {
      // 관리자 웹: 대시보드 중심
      return [
        { name: '대시보드', href: '/', icon: BarChart3 },
        { name: '작업지시 업로드', href: '/upload', icon: Upload },
        { name: '작업게시판', href: '/workboard', icon: Clipboard },
        { name: '라벨 프린터', href: '/label-printer', icon: Printer },
        { name: '현장 회신', href: '/board', icon: MessageSquare },
      ]
    }
  } else {
    // 현장팀: 환경에 관계없이 동일
    return [
      { name: '작업게시판', href: '/', icon: Clipboard },
      { name: '라벨 프린터', href: '/label-printer', icon: Printer },
      { name: '현장 회신', href: '/board', icon: MessageSquare },
    ]
  }
}

const RecentWorkOrdersSidebar = ({ isCollapsed, onToggle }: { isCollapsed: boolean, onToggle: () => void }) => {
  const { workOrders } = useWorkOrders()
  const recentWorkOrders = workOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  return (
    <div className={`${isCollapsed ? 'w-12' : 'w-80'} bg-white/80 backdrop-blur-sm border-l border-white/20 shadow-lg transition-all duration-300 ease-in-out`}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">최근 업로드</h3>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-slate-100 transition-all duration-200 transform hover:scale-105"
            title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {isCollapsed ? (
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-600" />
            )}
          </button>
        </div>
        
        {!isCollapsed && (
          <>
            {recentWorkOrders.length > 0 ? (
              <div className="space-y-3">
                {recentWorkOrders.map((workOrder) => (
                  <div key={workOrder.id} className="card-compact hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {workOrder.equipmentName}
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center space-x-2">
                      <span>{workOrder.operationTeam}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{workOrder.requestDate}</span>
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-1 truncate bg-slate-50 px-2 py-1 rounded-md">
                      {workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className={`badge ${
                        workOrder.status === 'pending' 
                          ? 'badge-warning'
                          : workOrder.status === 'in_progress'
                          ? 'badge-primary'
                          : 'badge-success'
                      }`}>
                        <div className={`status-dot mr-1.5 ${
                          workOrder.status === 'pending' 
                            ? 'status-pending'
                            : workOrder.status === 'in_progress'
                            ? 'status-progress'
                            : 'status-completed'
                        }`}></div>
                        {workOrder.status === 'pending' ? '대기' : 
                         workOrder.status === 'in_progress' ? '진행중' : '완료'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">업로드된 작업지시가 없습니다</p>
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

  const navigation = getNavigationItems(isAdmin, isMobileApp())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 최상단 헤더 - 로고와 사용자 정보만 */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 로고 */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <div className="w-6 h-6 bg-white rounded-md"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">LineGuide</h1>
                <span className="hidden sm:block text-xs text-blue-100 font-medium">
                  KT 통신장비 유지보수 관리
                </span>
              </div>
            </div>

            {/* 사용자 정보 및 모바일 메뉴 */}
            <div className="flex items-center space-x-4">
              {/* 사용자 정보 */}
              <div className="hidden sm:flex items-center space-x-3 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-white">{user?.team}</div>
                  <div className="text-blue-100 text-xs">
                    {user?.userType === 'admin' ? '관리자' : '현장팀'}
                  </div>
                </div>
              </div>
              
              {/* 로그아웃 버튼 */}
              <button
                onClick={logout}
                className="hidden sm:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>

              {/* 모바일 메뉴 버튼 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center h-16">
            {/* 데스크톱 네비게이션 */}
            <div className="hidden sm:flex sm:space-x-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    )}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

        </div>

        {/* 모바일 메뉴 */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-white/20 py-4 bg-white/90 backdrop-blur-sm">
            <div className="flex flex-col space-y-2 px-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center px-4 py-3 text-base font-semibold rounded-xl transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* 모바일 사용자 정보 및 로그아웃 */}
              <div className="border-t border-slate-200 pt-4 mt-4">
                <div className="flex items-center px-4 py-3 bg-slate-50 rounded-xl mb-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-slate-800">{user?.team}</div>
                    <div className="text-slate-600">
                      {user?.userType === 'admin' ? '관리자' : '현장팀'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout()
                    setMobileMenuOpen(false)
                  }}
                  className="flex items-center w-full px-4 py-3 text-base font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200"
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <div className="flex min-h-[calc(100vh-8rem)]">
        <main className={`flex-1 py-6 px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          location.pathname === '/' 
            ? sidebarCollapsed 
              ? 'max-w-7xl mx-auto' 
              : 'max-w-5xl mx-auto'
            : 'max-w-7xl mx-auto'
        }`}>
          <div className="py-6 fade-in">
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