import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Filter, ChevronDown, ChevronRight, Users, Trash2 } from 'lucide-react'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import { useAuth } from '@/contexts/AuthContext'
import { WorkOrderFilter, OperationTeam, WorkOrderStatus, WorkOrder } from '@/types'
import WorkOrderTable from '@/components/WorkOrderTable'


export default function WorkBoard() {
  const { user, isAdmin } = useAuth()
  const location = useLocation()
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
      f.operationTeam = (user.team as unknown as OperationTeam)
    } else if (selectedTeam) {
      f.operationTeam = selectedTeam
    }
    
    if (selectedStatus) f.status = selectedStatus
    if (searchTerm.trim()) f.searchTerm = searchTerm.trim()
    return f
  }, [selectedTeam, selectedStatus, searchTerm, isAdmin, user?.team])

  const { workOrders, loading, clearAllWorkOrders } = useWorkOrdersAPI(filter)
  const [cleared, setCleared] = useState(false)

  // 단순 필터링 + 안정 정렬: 서버에서 준 배열을 그대로 사용(그룹/uniq 사용 금지)
  const keyTeam = (t?: string) => t ? t.replace(/\s+/g,'').replace(/\u200B/g,'').trim() : ''
  const visible = useMemo(() => {
    let arr = workOrders
    if (selectedTeam) {
      const selKey = keyTeam(selectedTeam)
      arr = arr.filter(w => {
        const keys = (w as any).teamKeys as string[] | undefined
        return keys ? keys.includes(selKey) : keyTeam(w.operationTeam) === selKey
      })
    }
    if (selectedStatus) {
      arr = arr.filter(w => w.status === selectedStatus)
    }
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase()
      arr = arr.filter(w => [
        w.managementNumber || '',
        w.operationTeam || '',
        w.equipmentName || '',
        w.serviceType || ''
      ].some(f => f.toLowerCase().includes(s)))
    }
    return [...arr].sort((a, b) => {
      const am = a.managementNumber || ''
      const bm = b.managementNumber || ''
      const ab = am.replace(/_(DU측|RU측)$/,'')
      const bb = bm.replace(/_(DU측|RU측)$/,'')
      if (ab === bb) {
        if (a.workType === b.workType) return am.localeCompare(bm)
        return a.workType === 'DU측' ? -1 : 1
      }
      return ab.localeCompare(bb)
    })
  }, [workOrders, selectedTeam, selectedStatus, searchTerm])

  // 운용팀별로 관리번호 그룹화
  const workOrdersByTeam = useMemo(() => {
    const grouped: Record<string, Record<string, { du: WorkOrder | null, ru: WorkOrder[] }>> = {}
    // 팀 보기를 위해 기존 그룹 계산 유지(리스트 표시에는 사용하지 않음)
    const tempByMgmt: Record<string, { du: WorkOrder | null, ru: WorkOrder[] }> = {}
    workOrders.forEach(workOrder => {
      const baseManagementNumber = (workOrder as any).customer_name?.replace(/_DU측.*|_RU측.*/g, '') || workOrder.managementNumber
      if (!tempByMgmt[baseManagementNumber]) tempByMgmt[baseManagementNumber] = { du: null, ru: [] }
      if (workOrder.workType === 'DU측' || (workOrder as any).customer_name?.includes('_DU측')) {
        tempByMgmt[baseManagementNumber].du = workOrder
      } else {
        tempByMgmt[baseManagementNumber].ru.push(workOrder)
      }
    })
    Object.entries(tempByMgmt).forEach(([managementNumber, workOrderGroup]) => {
      const team = workOrderGroup.du?.operationTeam || workOrderGroup.ru[0]?.operationTeam
      if (team) {
        if (!grouped[team]) grouped[team] = {}
        grouped[team][managementNumber] = workOrderGroup
      }
    })
    return grouped
  }, [workOrders])

  const teamStats = useMemo(() => {
    const stats: Record<string, { total: number; pending: number; inProgress: number; completed: number; du: number; ru: number }> = {}
    
    Object.entries(workOrdersByTeam).forEach(([team, managementNumbers]) => {
      let total = 0;
      let pending = 0;
      let inProgress = 0;
      let completed = 0;
      let duCount = 0;
      let ruCount = 0;

      Object.entries(managementNumbers).forEach(([_, workOrderGroup]) => {
        if (workOrderGroup.du) {
          total++;
          if (workOrderGroup.du.status === 'pending') pending++;
          if (workOrderGroup.du.status === 'in_progress') inProgress++;
          if (workOrderGroup.du.status === 'completed') completed++;
          duCount++;
        }
        ruCount += workOrderGroup.ru.length;
      });

      stats[team] = {
        total,
        pending,
        inProgress,
        completed,
        du: duCount,
        ru: ruCount
      };
    });
    
    return stats
  }, [workOrdersByTeam])

  // 페이지 접근 시 데이터 새로고침 (업로드 후 이동 시 최신 데이터 보장)
  useEffect(() => {
    console.log('🔄 WorkBoard 페이지 접근, 데이터 새로고침')
    // refreshData는 이미 useWorkOrdersAPI에서 자동으로 호출되므로 별도 호출 불필요
  }, [location.pathname])

  // 디버깅: 작업지시 로드 상태 확인
  useEffect(() => {
    console.log('📋 WorkBoard 디버깅:', {
      totalWorkOrders: workOrders.length,
      filter,
      user: user?.team,
      isAdmin,
      workOrdersSample: workOrders.slice(0, 3).map(wo => ({
        id: wo.id,
        managementNumber: wo.managementNumber,
        operationTeam: wo.operationTeam,
        status: wo.status
      }))
    });
  }, [workOrders, filter, user, isAdmin])

  // 데이터 로딩 표시 - 모든 Hook 이후에 조건부 렌더링
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">작업지시를 불러오는 중...</span>
      </div>
    )
  }

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
          // API를 통한 전체 삭제
          const result = await clearAllWorkOrders()
          
          if (result.success) {
            alert('✅ 모든 작업지시가 삭제되었습니다.')
            // 자동 재조회 금지: 로컬 상태를 즉시 비워 표시 유지
            setCleared(true)
          } else {
            throw new Error(result.error || '알 수 없는 오류')
          }
        } catch (error) {
          alert('❌ 삭제 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : error))
        }
      }
    }
  }

  const activeFiltersCount = [selectedTeam, selectedStatus, searchTerm].filter(Boolean).length

  return (
    <div className="space-y-4 px-2 sm:px-0">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">작업게시판</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            {isAdmin 
              ? '운용팀별 작업지시를 확인하고 상태를 관리하세요'
              : `${user?.team} 작업지시를 확인하고 상태를 관리하세요`
            }
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setViewMode('teams')}
              className={`btn text-sm ${viewMode === 'teams' ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Users className="w-4 h-4 mr-1" />
              팀별 보기
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`btn text-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            >
              전체 목록
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="관리번호, 장비명 등으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10 w-full text-sm"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn text-sm ${activeFiltersCount > 0 ? 'btn-primary' : 'btn-secondary'} relative`}
            >
              <Filter className="w-4 h-4 mr-1" />
              필터
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
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
          총 {cleared ? 0 : workOrders.length}개의 작업지시
          {activeFiltersCount > 0 && ' (필터링됨)'}
        </div>
        
        {(cleared ? 0 : workOrders.length) > 0 && (
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

      {cleared ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">작업지시가 없습니다</h3>
          <p className="text-gray-600">Excel 파일을 업로드하여 작업지시를 등록하세요</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-6">
          <WorkOrderTable workOrders={visible} />
        </div>
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
              .map(([team, managementNumbers]) => {
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
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              DU: {stats.du}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              RU: {stats.ru}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                          <span className="text-gray-600">대기 {stats.pending}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-gray-600">진행중 {stats.inProgress}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span className="text-gray-600">완료 {stats.completed}</span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-gray-200 space-y-6">
                        {Object.entries(managementNumbers).map(([managementNumber, workOrderGroup]) => (
                          <div key={managementNumber} className="p-4 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-lg font-semibold text-gray-900">관리번호: {managementNumber}</h3>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {workOrderGroup.du ? 'DU + ' : ''}{workOrderGroup.ru.length}RU
                                </span>
                              </div>
                              <div className="flex items-center space-x-2">
                                {workOrderGroup.du && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    DU측
                                  </span>
                                )}
                                {workOrderGroup.ru.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    RU측 {workOrderGroup.ru.length}개
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {/* DU측 작업 */}
                              {workOrderGroup.du && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-3">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <h4 className="text-sm font-medium text-blue-800">DU측 작업 (집중국)</h4>
                                  </div>
                                  <WorkOrderTable workOrders={[workOrderGroup.du]} />
                                </div>
                              )}
                              
                              {/* RU측 작업들 */}
                              {workOrderGroup.ru.length > 0 && (
                                <div>
                                  <div className="flex items-center space-x-2 mb-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <h4 className="text-sm font-medium text-green-800">RU측 작업 (현장) - {workOrderGroup.ru.length}개</h4>
                                  </div>
                                  <WorkOrderTable workOrders={workOrderGroup.ru} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        
                        {/* 작업이 없는 경우 */}
                        {Object.keys(managementNumbers).length === 0 && (
                          <div className="p-8 text-center text-gray-500">
                            <p>해당 팀의 작업지시가 없습니다.</p>
                          </div>
                        )}
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