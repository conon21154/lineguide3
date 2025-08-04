import { useState, useMemo } from 'react'
import { Search, Filter, ChevronDown, ChevronRight, Users, Trash2 } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useAuth } from '@/contexts/AuthContext'
import { WorkOrderFilter, OperationTeam, WorkOrderStatus, WorkOrder } from '@/types'
import WorkOrderTable from '@/components/WorkOrderTable'


export default function WorkBoard() {
  const { user, isAdmin } = useAuth()
  const [selectedTeam, setSelectedTeam] = useState<OperationTeam | ''>('')
  const [selectedStatus, setSelectedStatus] = useState<WorkOrderStatus | ''>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'teams'>('teams')
  const [collapsedTeams, setCollapsedTeams] = useState<Set<OperationTeam>>(new Set())

  const filter: WorkOrderFilter = useMemo(() => {
    const f: WorkOrderFilter = {}
    
    // 현장팀 사용자는 자신의 팀 작업만 볼 수 있음
    if (!isAdmin && user?.team) {
      f.operationTeam = user.team
    } else if (selectedTeam) {
      f.operationTeam = selectedTeam
    }
    
    if (selectedStatus) f.status = selectedStatus
    if (searchTerm.trim()) f.searchTerm = searchTerm.trim()
    return f
  }, [selectedTeam, selectedStatus, searchTerm, isAdmin, user?.team])

  const { workOrders } = useWorkOrders(filter)

  // 운용팀별로 작업지시 그룹화
  const workOrdersByTeam = useMemo(() => {
    const grouped: Record<OperationTeam, WorkOrder[]> = {} as Record<OperationTeam, WorkOrder[]>
    
    workOrders.forEach(workOrder => {
      if (!grouped[workOrder.operationTeam]) {
        grouped[workOrder.operationTeam] = []
      }
      grouped[workOrder.operationTeam].push(workOrder)
    })
    
    // 각 팀별로 상태별 정렬 (대기 -> 진행중 -> 완료)
    Object.keys(grouped).forEach(team => {
      grouped[team as OperationTeam].sort((a, b) => {
        const statusOrder: Record<WorkOrderStatus, number> = { pending: 0, in_progress: 1, completed: 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
    })
    
    return grouped
  }, [workOrders])

  const teamStats = useMemo(() => {
    const stats: Record<OperationTeam, { total: number; pending: number; inProgress: number; completed: number }> = {} as Record<OperationTeam, { total: number; pending: number; inProgress: number; completed: number }>
    
    Object.entries(workOrdersByTeam).forEach(([team, orders]) => {
      stats[team as OperationTeam] = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        inProgress: orders.filter(o => o.status === 'in_progress').length,
        completed: orders.filter(o => o.status === 'completed').length
      }
    })
    
    return stats
  }, [workOrdersByTeam])

  const clearFilters = () => {
    setSelectedTeam('')
    setSelectedStatus('')
    setSearchTerm('')
  }

  const toggleTeamCollapse = (team: OperationTeam) => {
    const newCollapsed = new Set(collapsedTeams)
    if (newCollapsed.has(team)) {
      newCollapsed.delete(team)
    } else {
      newCollapsed.add(team)
    }
    setCollapsedTeams(newCollapsed)
  }

  const handleClearAll = async () => {
    const confirmed = window.confirm('⚠️ 정말로 모든 작업지시를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')
    
    if (confirmed) {
      const doubleConfirm = window.confirm('🚨 최종 확인\n\n모든 작업지시 데이터가 영구적으로 삭제됩니다.\n정말로 계속하시겠습니까?')
      
      if (doubleConfirm) {
        try {
          // workOrderStore의 clearAllWorkOrders 메서드 사용
          const { workOrderStore } = await import('@/stores/workOrderStore')
          workOrderStore.clearAllWorkOrders()
          
          // 성공 메시지 표시
          alert('✅ 모든 작업지시가 삭제되었습니다.')
        } catch (error) {
          alert('❌ 삭제 중 오류가 발생했습니다: ' + error)
        }
      }
    }
  }

  const activeFiltersCount = [selectedTeam, selectedStatus, searchTerm].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">작업게시판</h1>
          <p className="mt-2 text-gray-600">
            {isAdmin 
              ? '운용팀별 작업지시를 확인하고 상태를 관리하세요'
              : `${user?.team} 작업지시를 확인하고 상태를 관리하세요`
            }
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('teams')}
              className={`btn ${viewMode === 'teams' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users className="w-4 h-4 mr-2" />
              팀별 보기
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            >
              전체 목록
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="관리번호, 장비명, DU명 등으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full sm:w-64"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-secondary'} relative`}
          >
            <Filter className="w-4 h-4 mr-2" />
            필터
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-danger-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* 관리자만 팀 필터 표시 */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  운용팀
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value as OperationTeam | '')}
                  className="input w-full sm:w-40"
                >
                  <option value="">전체</option>
                  <option value="울산T">울산T</option>
                  <option value="동부산T">동부산T</option>
                  <option value="중부산T">중부산T</option>
                  <option value="서부산T">서부산T</option>
                  <option value="김해T">김해T</option>
                  <option value="창원T">창원T</option>
                  <option value="진주T">진주T</option>
                  <option value="통영T">통영T</option>
                  <option value="지하철T">지하철T</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as WorkOrderStatus | '')}
                className="input w-full sm:w-32"
              >
                <option value="">전체</option>
                <option value="pending">대기</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
                disabled={activeFiltersCount === 0}
              >
                초기화
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          총 {workOrders.length}개의 작업지시
          {activeFiltersCount > 0 && ' (필터링됨)'}
        </div>
        
        {workOrders.length > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            title="모든 작업지시 삭제"
          >
            <Trash2 className="h-4 w-4" />
            <span>전체 삭제</span>
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <WorkOrderTable workOrders={workOrders} />
      ) : (
        <div className="space-y-6">
          {Object.entries(workOrdersByTeam).length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                <Users className="h-12 w-12" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                작업지시가 없습니다
              </h3>
              <p className="text-gray-600">
                Excel 파일을 업로드하여 작업지시를 등록하세요
              </p>
            </div>
          ) : (
            Object.entries(workOrdersByTeam)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([team, teamWorkOrders]) => {
                const stats = teamStats[team as OperationTeam]
                const isCollapsed = collapsedTeams.has(team as OperationTeam)
                
                return (
                  <div key={team} className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleTeamCollapse(team as OperationTeam)}
                    >
                      <div className="flex items-center space-x-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="flex items-center space-x-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {team}
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            총 {stats.total}건
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-warning-400 rounded-full"></div>
                          <span className="text-gray-600">대기 {stats.pending}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
                          <span className="text-gray-600">진행중 {stats.inProgress}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-success-400 rounded-full"></div>
                          <span className="text-gray-600">완료 {stats.completed}</span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-gray-200">
                        <WorkOrderTable workOrders={teamWorkOrders} />
                      </div>
                    )}
                  </div>
                )
              })
          )}
        </div>
      )}
    </div>
  )
}