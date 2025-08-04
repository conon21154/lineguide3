import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, Upload, Clipboard, Clock, ChevronLeft, ChevronRight, Printer, LogOut, User } from 'lucide-react'
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
  const { user, logout, isAdmin } = useAuth()

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const navigation = isAdmin ? adminNavigation : fieldNavigation

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  LineGuide
                </h1>
                <span className="ml-2 text-sm text-gray-500">
                  KT 통신장비 유지보수 관리
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
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
            </div>
            
            {/* 사용자 정보 및 로그아웃 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-medium">
                  {user?.team} {user?.userType === 'admin' ? '관리자' : '현장팀'}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
                <span>로그아웃</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        <main className={`flex-1 py-6 sm:px-6 lg:px-8 transition-all duration-300 ${
          location.pathname === '/' 
            ? sidebarCollapsed 
              ? 'max-w-7xl mx-auto' 
              : 'max-w-5xl mx-auto'
            : 'max-w-7xl mx-auto'
        }`}>
          <div className="px-4 py-6 sm:px-0">
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