import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useDebounce } from 'use-debounce'
import { Search, Filter, ChevronDown, ChevronRight, Users, Trash2, X, Eye, Clock, User, CheckCircle } from 'lucide-react'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import { useAuth } from '@/contexts/AuthContext'
import { WorkOrderFilter, OperationTeam, WorkOrderStatus, WorkOrder } from '@/types'
import WorkOrderTable from '@/components/WorkOrderTable'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import clsx from 'clsx'

// StatusBadge 컴포넌트
const StatusBadge = ({ status }: { status: WorkOrderStatus }) => {
  const statusConfig = {
    pending: {
      label: '대기',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800'
    },
    in_progress: {
      label: '진행중',
      icon: User,
      className: 'bg-[#1E40AF]/10 text-[#1E40AF]'
    },
    completed: {
      label: '완료',
      icon: CheckCircle,
      className: 'bg-green-100 text-green-800'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  )
}

// 완전한 작업지시 상세 모달 (기존과 동일)
const WorkOrderDetailModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex justify-between items-center p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">작업지시 상세정보</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">기본 정보</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-gray-700">관리번호:</span> 
                  <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 break-all">
                    <div className="flex items-center space-x-2">
                      <span>{workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}</span>
                      {workOrder.managementNumber.includes('_DU측') && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          DU측 작업
                        </span>
                      )}
                      {workOrder.managementNumber.includes('_RU측') && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          RU측 작업
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">작업요청일:</span>
                  <div className="text-sm mt-1 break-all">
                    {workOrder.requestDate}
                  </div>
                </div>
                <div><span className="font-medium text-gray-700">운용팀:</span> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{workOrder.operationTeam}</span></div>
                <div><span className="font-medium text-gray-700">상태:</span> <StatusBadge status={workOrder.status} /></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">DU 정보</h3>
              <div className="space-y-3">
                <div><span className="font-medium text-gray-700">DU ID:</span> {workOrder.duId}</div>
                <div><span className="font-medium text-gray-700">DU명:</span> {workOrder.duName}</div>
                <div><span className="font-medium text-gray-700">채널카드:</span> {workOrder.channelCard}</div>
                <div><span className="font-medium text-gray-700">포트:</span> {workOrder.port}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">장비 정보</h3>
              <div className="space-y-3">
                <div><span className="font-medium text-gray-700">장비 타입:</span> {workOrder.equipmentType}</div>
                <div><span className="font-medium text-gray-700">장비명:</span> {workOrder.equipmentName}</div>
                <div><span className="font-medium text-gray-700">종류:</span> {workOrder.category}</div>
                <div><span className="font-medium text-gray-700">서비스 위치:</span> {workOrder.serviceLocation}</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">RU 정보</h3>
              <div className="space-y-3">
                {workOrder.representativeRuId && (
                  <div><span className="font-medium text-gray-700">대표 RU ID:</span> {workOrder.representativeRuId}</div>
                )}
                {workOrder.coSiteCount5G && (
                  <div><span className="font-medium text-gray-700">5G Co-Site 수량:</span> {workOrder.coSiteCount5G}</div>
                )}
                {workOrder.concentratorName5G && workOrder.concentratorName5G !== 'N/A' && (
                  <div><span className="font-medium text-gray-700">5G 집중국명:</span> {workOrder.concentratorName5G}</div>
                )}
                
                {/* 여러 RU 정보 표시 */}
                {workOrder.ruInfoList && workOrder.ruInfoList.length > 0 && (
                  <div className="mt-4">
                    <span className="font-medium text-gray-700">전체 RU 목록:</span>
                    <div className="mt-2 space-y-2">
                      {workOrder.ruInfoList.map((ru, index) => {
                        const isRepresentative = ru.ruId === workOrder.representativeRuId;
                        const muxCH = ru.serviceType || workOrder.muxInfo?.['서비스구분'] || workOrder.serviceType;
                        
                        return (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{ru.ruName}</div>
                                <div className="text-xs text-gray-600">ID: {ru.ruId}</div>
                                {(ru.channelCard !== undefined && ru.channelCard !== '') && (
                                  <div className="text-xs text-gray-600">채널카드: {ru.channelCard}</div>
                                )}
                                {(ru.port !== undefined && ru.port !== '') && (
                                  <div className="text-xs text-gray-600">포트: {ru.port}</div>
                                )}
                                {muxCH && <div className="text-xs text-blue-600 font-medium">MUX CH: {muxCH}</div>}
                              </div>
                              {isRepresentative ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  대표 A
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  RU #{index + 1}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">선번장 정보</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">회선번호:</span>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 whitespace-nowrap tabular-nums">
                  {workOrder.lineNumber}
                </div>
              </div>
              {workOrder.muxInfo && (
                <div>
                  <span className="font-medium text-gray-700">LTE MUX/국간,간선망:</span>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="font-mono text-sm break-all">{workOrder.muxInfo.lteMux}</div>
                    {workOrder.muxInfo.muxType && (
                      <div className="text-xs text-gray-600 mt-1">MUX종류: {workOrder.muxInfo.muxType}</div>
                    )}
                    {workOrder.muxInfo.서비스구분 && (
                      <div className="text-xs text-blue-600 mt-1 font-medium">
                        서비스구분: {workOrder.muxInfo.서비스구분}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {workOrder.notes && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">메모</h3>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-sm">{workOrder.notes}</div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">시간 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
              <div><span className="font-medium">생성일:</span> {new Date(workOrder.createdAt).toLocaleString()}</div>
              <div><span className="font-medium">수정일:</span> {new Date(workOrder.updatedAt).toLocaleString()}</div>
              {workOrder.completedAt && (
                <div><span className="font-medium">완료일:</span> {new Date(workOrder.completedAt).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};


export default function WorkBoard() {
  const { user, isAdmin, isHydrated } = useAuth()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // URL 초기값
  const initQ = searchParams.get('q') ?? ''
  const initTeam = searchParams.get('team') ?? ''
  const initStatus = searchParams.get('status') ?? ''
  
  // 검색 상태 (IME 최적화)
  const [inputQ, setInputQ] = useState(initQ)
  const [isComposing, setIsComposing] = useState(false)
  const [debouncedQ] = useDebounce(inputQ, 300)
  
  // 필터 상태
  const [selectedTeam, setSelectedTeam] = useState<OperationTeam | ''>(initTeam as OperationTeam || '')
  const [selectedStatus, setSelectedStatus] = useState<WorkOrderStatus | ''>(initStatus as WorkOrderStatus || '')
  
  // UI 상태
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'teams'>('teams')
  const [collapsedTeams, setCollapsedTeams] = useState<Set<OperationTeam>>(new Set())
  const [collapsedWorkOrders, setCollapsedWorkOrders] = useState<Set<string>>(new Set())
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)
  
  // 대표 RU명 추론 함수
  const getRepresentativeRuName = (workOrderGroup: { du: WorkOrder | null, ru: WorkOrder[] }) => {
    // 1. DU 작업의 ruInfoList에서 대표 찾기
    if (workOrderGroup.du?.ruInfoList?.length) {
      const ruList = workOrderGroup.du.ruInfoList;
      
      // isRepresentative === true인 항목 찾기
      const representative = ruList.find(ru => (ru as any).isRepresentative === true);
      if (representative?.ruName) return representative.ruName;
      
      // '_RIU_A' 또는 '_A' 포함된 항목 찾기
      const ruA = ruList.find(ru => ru.ruName && (ru.ruName.includes('_RIU_A') || ru.ruName.includes('_A')));
      if (ruA?.ruName) return ruA.ruName;
      
      // 첫 번째 RU명 사용
      if (ruList[0]?.ruName) return ruList[0].ruName;
    }
    
    // 2. DU 작업에서 representativeRuId 필드 확인
    if (workOrderGroup.du?.representativeRuId) {
      return workOrderGroup.du.representativeRuId;
    }
    
    // 3. RU 작업들에서 찾기
    if (workOrderGroup.ru.length > 0) {
      for (const ruWork of workOrderGroup.ru) {
        if (ruWork.ruInfoList?.length) {
          const representative = ruWork.ruInfoList.find(ru => (ru as any).isRepresentative === true);
          if (representative?.ruName) return representative.ruName;
          
          const ruA = ruWork.ruInfoList.find(ru => ru.ruName && (ru.ruName.includes('_RIU_A') || ru.ruName.includes('_A')));
          if (ruA?.ruName) return ruA.ruName;
          
          if (ruWork.ruInfoList[0]?.ruName) return ruWork.ruInfoList[0].ruName;
        }
        
        // representativeRuId 필드 확인
        if (ruWork.representativeRuId) return ruWork.representativeRuId;
      }
    }
    
    // 4. 어떤 정보도 없으면 기본값
    return '대표RU명';
  };
  
  // 작업요청일 포맷 함수 (08월13일(화) 형식)
  const formatRequestDate = (dateStr?: string) => {
    if (!dateStr || dateStr === 'undefined') return '';
    try {
      // 다양한 날짜 형식 처리
      let date;
      if (dateStr.includes('/')) {
        // "2024/08/13" 형식
        date = new Date(dateStr);
      } else if (dateStr.includes('-')) {
        // "2024-08-13" 형식
        date = new Date(dateStr);
      } else if (dateStr.length === 8) {
        // "20240813" 형식
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        date = new Date(`${year}-${month}-${day}`);
      } else {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) {
        return dateStr; // 파싱 실패 시 원본 반환
      }
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
      const weekday = weekdays[date.getDay()];
      return `${month}월${day}일(${weekday})`;
    } catch {
      return dateStr;
    }
  };
  
  // 컴팩트 뷰 상태
  const [dense, setDense] = useState(localStorage.getItem('wb:dense') !== 'false')
  useEffect(() => { localStorage.setItem('wb:dense', String(dense)); }, [dense])

  // 효과적인 팀 계산: worker면 JWT 팀 강제, admin은 선택팀
  const effectiveTeam = useMemo(() => {
    if (user?.role === 'worker') {
      return user.team as OperationTeam || ''
    }
    return selectedTeam || ''
  }, [user?.role, user?.team, selectedTeam])

  // 서버로 보낼 상태 값 ('전체'는 제외)
  const statusParam = useMemo(() => {
    return selectedStatus && selectedStatus !== '전체' ? selectedStatus : undefined
  }, [selectedStatus])

  const filter: WorkOrderFilter = useMemo(() => {
    const f: WorkOrderFilter = {}
    
    // 팀 강제 적용: worker면 항상 JWT 팀, admin은 선택팀
    if (effectiveTeam) {
      f.operationTeam = effectiveTeam as OperationTeam
    }
    
    // '전체' 상태는 서버로 보내지 않음
    if (statusParam) {
      f.status = statusParam
    }
    
    if (debouncedQ.trim()) {
      f.searchTerm = debouncedQ.trim()
    }
    
    return f
  }, [effectiveTeam, statusParam, debouncedQ])

  const { workOrders, loading, clearAllWorkOrders, refreshData, updateStatus, deleteWorkOrder, setFilter } = useWorkOrdersAPI()
  
  // 필터가 변경될 때마다 API 호출
  useEffect(() => {
    setFilter(filter)
  }, [filter, setFilter])
  const [cleared, setCleared] = useState(false)

  // URL 동기화: 디바운스된 검색어와 필터를 URL에 반영 (조합 중엔 동기화 금지)
  useEffect(() => {
    if (isComposing) return
    
    const next = new URLSearchParams()
    if (selectedTeam) next.set('team', selectedTeam)
    if (selectedStatus) next.set('status', selectedStatus)
    if (debouncedQ.trim()) next.set('q', debouncedQ.trim())
    
    setSearchParams(next, { replace: true })
  }, [debouncedQ, selectedTeam, selectedStatus, isComposing, setSearchParams])
  
  // 필터 업데이트 함수 - 상태만 업데이트 (URL은 useEffect가 처리)
  const updateFilter = useCallback((patch: Partial<{ team: OperationTeam | '', status: WorkOrderStatus | '', q: string }>) => {
    if ('team' in patch) setSelectedTeam(patch.team as OperationTeam || '')
    if ('status' in patch) setSelectedStatus(patch.status as WorkOrderStatus || '')
    if ('q' in patch) {
      setInputQ(patch.q || '')
      // 즉시 검색이 필요한 경우 (필터 초기화 등)
      if (!patch.q) {
        setIsComposing(false)
      }
    }
  }, [])

  // 서버에서 이미 필터링된 데이터를 사용하므로 클라이언트 필터링 제거
  // 정렬만 클라이언트에서 수행
  const visible = useMemo(() => {
    return [...workOrders].sort((a, b) => {
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
  }, [workOrders])

  // 운용팀별로 관리번호 그룹화 - 필터링된 workOrders 기반
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

  // 팀별 보기에서는 더 이상 collapse 상태가 필요하지 않음 (단순화됨)

  // URL 쿼리 변경 시 상태 업데이트만 수행 (필터는 별도 useEffect에서)
  useEffect(() => {
    const team = searchParams.get('team')
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    
    // 상태 업데이트만
    if (team !== null) setSelectedTeam(team as OperationTeam || '')
    if (status !== null) setSelectedStatus(status as WorkOrderStatus || '')
    if (q !== null) setInputQ(q || '')
  }, [searchParams])
  


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

  // 모든 함수들을 Hook 사용 영역에 정의 (조건부 return 이전)
  const clearFilters = useCallback(() => {
    // 현장팀 사용자는 팀 필터를 초기화하지 않음 (항상 자신의 팀)
    if (isAdmin) {
      updateFilter({ team: '', status: '', q: '' })
    } else {
      updateFilter({ status: '', q: '' })
    }
  }, [isAdmin, updateFilter])

  const toggleTeamCollapse = useCallback((team: OperationTeam) => {
    const newCollapsed = new Set(collapsedTeams)
    if (newCollapsed.has(team)) {
      newCollapsed.delete(team)
    } else {
      newCollapsed.add(team)
    }
    setCollapsedTeams(newCollapsed)
  }, [collapsedTeams])

  const toggleWorkOrderCollapse = useCallback((workOrderId: string) => {
    const newCollapsed = new Set(collapsedWorkOrders)
    if (newCollapsed.has(workOrderId)) {
      newCollapsed.delete(workOrderId)
    } else {
      newCollapsed.add(workOrderId)
    }
    setCollapsedWorkOrders(newCollapsed)
  }, [collapsedWorkOrders])

  const handleClearAll = useCallback(async () => {
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
  }, [clearAllWorkOrders, setCleared])

  // 필터 활성 개수 계산 (현장팀은 팀 선택 불가하므로 제외)
  const activeFiltersCount = useMemo(() => {
    const filters = []
    if (isAdmin && selectedTeam) filters.push(selectedTeam) // 관리자만 팀 필터 카운트
    if (selectedStatus && selectedStatus !== '전체') filters.push(selectedStatus)
    if (debouncedQ.trim()) filters.push(debouncedQ)
    return filters.length
  }, [isAdmin, selectedTeam, selectedStatus, debouncedQ])

  // 디버깅: 명시적 조건 로그
  console.log('🔍 렌더링 조건 체크:', {
    loading,
    isHydrated,
    shouldShowLoading: loading || !isHydrated,
    user: !!user,
    hasWorkOrders: workOrders.length > 0
  })

  // 데이터 로딩 표시 - 모든 Hook 이후에 조건부 렌더링
  if (loading || !isHydrated) {
    console.log('🔄 로딩 화면 표시:', { loading, isHydrated })
    return (
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 bg-slate-50">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E40AF]"></div>
          <span className="ml-3 text-slate-600">
            {!isHydrated ? '인증 정보를 복원 중...' : '작업지시를 불러오는 중...'}
          </span>
        </div>
      </div>
    )
  }

  console.log('✅ 메인 컨텐츠 렌더링')

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 bg-slate-50">
      <PageHeader
        title="작업게시판"
        subtitle={
          isAdmin 
            ? '운용팀별 작업지시를 확인하고 상태를 관리하세요'
            : `${user?.team} 작업지시를 확인하고 상태를 관리하세요`
        }
      />
        
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === 'teams' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('teams')}
          >
            <Users className="w-4 h-4 mr-1" />
            팀별 보기
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'secondary'}
            onClick={() => setViewMode('list')}
          >
            전체 목록
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="관리번호, 장비명 등으로 검색..."
              value={inputQ}
              onChange={(e) => setInputQ(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false)
                setInputQ(e.currentTarget.value)
              }}
              autoComplete="off"
              inputMode="search"
              enterKeyHint="search"
              className="pl-10"
            />
          </div>
          
          <Button
            variant={activeFiltersCount > 0 ? 'primary' : 'secondary'}
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="w-4 h-4 mr-1" />
            필터
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          
          <button
            type="button"
            onClick={() => setDense(v => !v)}
            aria-pressed={dense}
            className="rounded-lg border px-2.5 py-1.5 text-sm hover:bg-slate-50"
          >
            {dense ? '넓게 보기' : '컴팩트'}
          </button>
        </div>
      </div>

      {showFilters && (
        <Card className="sticky top-0 z-10">
          <div className="flex flex-col gap-3">
            {/* 관리자만 팀 필터 표시 */}
            {isAdmin && (
              <Field label="운용팀">
                <Select
                  value={selectedTeam}
                  onChange={(e) => updateFilter({ team: e.target.value as OperationTeam | '' })}
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
                </Select>
              </Field>
            )}
            
            <Field label="상태">
              <Select
                value={selectedStatus}
                onChange={(e) => updateFilter({ status: e.target.value as WorkOrderStatus | '' })}
              >
                <option value="">전체</option>
                <option value="pending">대기</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
              </Select>
            </Field>
            
            <Button
              variant="secondary"
              onClick={clearFilters}
              disabled={activeFiltersCount === 0}
              className="w-full"
            >
              초기화
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">
          총 {cleared ? 0 : workOrders.length}개의 작업지시
          {activeFiltersCount > 0 && ' (필터링됨)'}
          {debouncedQ && (
            <span className="ml-2 text-[#1E40AF] font-medium">
              검색: "{debouncedQ}"
            </span>
          )}
        </div>
        
        {user?.role === 'admin' && (cleared ? 0 : workOrders.length) > 0 && (
          <Button
            variant="danger"
            onClick={handleClearAll}
            title="모든 작업지시 삭제"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">전체 삭제</span>
            <span className="sm:hidden">삭제</span>
          </Button>
        )}
      </div>

      {cleared ? (
        <Card>
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
              <Users className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">작업지시가 없습니다</h3>
            <p className="text-slate-600">Excel 파일을 업로드하여 작업지시를 등록하세요</p>
          </div>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3 md:space-y-4">
          <WorkOrderTable 
            workOrders={visible} 
            dense={dense}
            onRefresh={refreshData}
            onUpdateStatus={updateStatus}
            onDeleteWorkOrder={deleteWorkOrder}
          />
        </div>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {Object.entries(workOrdersByTeam).length === 0 ? (
            <Card>
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                  <Users className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  작업지시가 없습니다
                </h3>
                <p className="text-slate-600">
                  Excel 파일을 업로드하여 작업지시를 등록하세요
                </p>
              </div>
            </Card>
          ) : (
            Object.entries(workOrdersByTeam)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([team, managementNumbers]) => {
                const stats = teamStats[team as OperationTeam]
                const isCollapsed = collapsedTeams.has(team as OperationTeam)
                
                return (
                  <Card key={team}>
                    <div 
                      className="flex min-w-0 items-center justify-between cursor-pointer hover:bg-slate-50 -m-4 p-4 rounded-2xl transition-colors"
                      onClick={() => toggleTeamCollapse(team as OperationTeam)}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
                        )}
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="inline-flex items-center h-6 px-2 rounded-md text-xs shrink-0 font-medium bg-[#1E40AF]/10 text-[#1E40AF]">
                            <span className="truncate" title={team}>{team}</span>
                          </span>
                          <span className="text-sm sm:text-lg font-semibold text-slate-900 shrink-0">
                            총 {stats.total}건
                          </span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="inline-flex items-center h-6 px-2 rounded-md text-xs shrink-0 font-medium bg-[#1E40AF]/10 text-[#1E40AF]">
                              DU: {stats.du}
                            </span>
                            <span className="inline-flex items-center h-6 px-2 rounded-md text-xs shrink-0 font-medium bg-green-100 text-green-800">
                              RU: {stats.ru}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-slate-600">대기 {stats.pending}</span>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 bg-[#1E40AF] rounded-full"></div>
                          <span className="text-slate-600">진행중 {stats.inProgress}</span>
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-slate-600">완료 {stats.completed}</span>
                        </div>
                      </div>
                    </div>
                    
                    {!isCollapsed && (
                      <div className="border-t border-slate-200 space-y-3 md:space-y-4 mt-4 pt-4">
                        {Object.entries(managementNumbers).map(([managementNumber, workOrderGroup]) => {
                          const representativeRuName = getRepresentativeRuName(workOrderGroup);
                          const requestDate = workOrderGroup.du?.requestDate || workOrderGroup.ru[0]?.requestDate || '';
                          const formattedDate = formatRequestDate(requestDate);
                          
                          // 대표 작업지시 선택 (DU 우선, 없으면 첫 번째 RU)
                          const representativeWorkOrder = workOrderGroup.du || workOrderGroup.ru[0];
                          
                          // 관리번호에서 접미사 분리
                          const baseNumber = managementNumber;
                          const workType = workOrderGroup.du && workOrderGroup.ru.length > 0 
                            ? 'DU/RU측' 
                            : workOrderGroup.du ? 'DU측' : 'RU측';
                          
                          return (
                            <div key={managementNumber} className="border-b border-slate-100 last:border-b-0">
                              {/* 최상위 카드 - 바로 상세 모달 열기 */}
                              <div 
                                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                onClick={() => representativeWorkOrder && setViewingDetailId(representativeWorkOrder.id)}
                                onKeyDown={(e) => {
                                  if ((e.key === 'Enter' || e.key === ' ') && representativeWorkOrder) {
                                    e.preventDefault();
                                    setViewingDetailId(representativeWorkOrder.id);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-label={`${managementNumber} 작업지시 상세보기`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  {/* 왼쪽: 관리번호 */}
                                  <div className="flex-shrink-0">
                                    <div className="text-lg font-bold text-slate-900">
                                      {baseNumber}
                                    </div>
                                    <div className="text-sm font-normal text-slate-600">
                                      {workType}
                                    </div>
                                  </div>
                                  
                                  {/* 중앙: 대표 RU명 */}
                                  <div className="flex-1 min-w-0 text-center">
                                    <div className="text-sm font-medium text-slate-900 truncate" title={representativeRuName}>
                                      {representativeRuName}
                                    </div>
                                  </div>
                                  
                                  {/* 오른쪽: 작업요청일 */}
                                  <div className="flex-shrink-0 text-right">
                                    <div className="text-sm font-medium text-slate-900">
                                      {formattedDate}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      {workOrderGroup.du && (
                                        <span className="inline-flex items-center h-5 px-2 rounded text-xs font-medium bg-[#1E40AF]/10 text-[#1E40AF]">
                                          DU
                                        </span>
                                      )}
                                      {workOrderGroup.ru.length > 0 && (
                                        <span className="inline-flex items-center h-5 px-2 rounded text-xs font-medium bg-green-100 text-green-800">
                                          RU{workOrderGroup.ru.length > 1 ? ` ${workOrderGroup.ru.length}개` : ''}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* 작업이 없는 경우 */}
                        {Object.keys(managementNumbers).length === 0 && (
                          <div className="p-8 text-center text-slate-500">
                            <p>해당 팀의 작업지시가 없습니다.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })
          )}
        </div>
      )}
      
      {/* 상세 모달 */}
      {viewingDetailId && (
        <WorkOrderDetailModal
          workOrder={workOrders.find(wo => wo.id === viewingDetailId)!}
          onClose={() => setViewingDetailId(null)}
        />
      )}
    </div>
  )
}