import { useState, useEffect, useCallback } from 'react'
import { WorkOrder, WorkOrderFilter, ResponseNote } from '@/types'
import { API_ENDPOINTS, apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/config/api'

interface UseWorkOrdersResult {
  workOrders: WorkOrder[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  } | null
  // CRUD 함수들
  addWorkOrders: (orders: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]) => Promise<{ success: boolean; data?: WorkOrder[]; error?: string }>
  updateStatus: (id: string, status: WorkOrder['status'], notes?: string) => Promise<{ success: boolean; error?: string }>
  deleteWorkOrder: (id: string) => Promise<{ success: boolean; error?: string }>
  clearAllWorkOrders: () => Promise<{ success: boolean; error?: string }>
  updateResponseNote: (id: string, responseNote: Partial<ResponseNote>) => Promise<{ success: boolean; error?: string }>
  markResponseNoteAsChecked: (id: string) => Promise<{ success: boolean; error?: string }>
  uploadCSV: (file: File) => Promise<{ success: boolean; data?: any; error?: string }>
  refreshData: () => Promise<void>
  setPage: (page: number) => void
  setFilter: (filter: WorkOrderFilter) => void
}

export function useWorkOrders(
  initialFilter?: WorkOrderFilter,
  initialPage: number = 1,
  initialLimit: number = 20
): UseWorkOrdersResult {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<UseWorkOrdersResult['pagination']>(null)
  const [currentFilter, setCurrentFilter] = useState<WorkOrderFilter>(initialFilter || {})
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [currentLimit] = useState(initialLimit)

  // 백엔드 데이터를 프론트엔드 WorkOrder 타입으로 정규화하는 함수
  const normalizeWorkOrder = (backendData: any): WorkOrder => {
    console.log('🔍 백엔드 데이터 정규화:', backendData);
    
    // JSON 필드 파싱
    const parseJsonField = (field: any) => {
      if (typeof field === 'string') {
        try { return JSON.parse(field); } catch { return field; }
      }
      return field || {};
    };

    const muxInfo = parseJsonField(backendData.muxInfo || backendData.mux_info);
    const ruInfoList = parseJsonField(backendData.ruInfoList || backendData.ru_info_list);

    // 새로운 WorkOrder 스펙에 맞게 정규화
    const normalized: WorkOrder = {
      id: backendData.id?.toString() || backendData.managementNumber,
      managementNumber: backendData.managementNumber || backendData.customer_name || '',
      requestDate: backendData.requestDate || backendData.request_date,
      operationTeam: backendData.operationTeam || backendData.team || '',
      
      equipmentType: backendData.equipmentType || backendData.category,
      equipmentName: backendData.equipmentName,
      category: backendData.category,
      serviceLocation: backendData.serviceLocation || backendData.service_location,
      serviceType: backendData.serviceType,
      
      concentratorName5G: backendData.concentratorName5G,
      coSiteCount5G: backendData.coSiteCount5G,
      
      ruInfoList: Array.isArray(ruInfoList) ? ruInfoList : undefined,
      representativeRuId: backendData.representativeRuId,
      
      muxInfo: muxInfo,
      lineNumber: backendData.lineNumber,
      
      duId: backendData.duId,
      duName: backendData.duName,
      channelCard: backendData.channelCard,
      port: backendData.port,
      
      workType: backendData.workType,
      status: backendData.status || 'pending',
      notes: backendData.notes,
      
      createdAt: backendData.createdAt || backendData.created_at,
      updatedAt: backendData.updatedAt || backendData.updated_at,
      completedAt: backendData.completedAt || backendData.completed_at,
      
      responseNote: parseJsonField(backendData.responseNote || backendData.response_note)
    };

    console.log('✅ 정규화 완료:', normalized);
    return normalized;
  }

  // 작업지시 목록 조회
  const fetchWorkOrders = useCallback(async (
    filter: WorkOrderFilter = currentFilter,
    page: number = currentPage,
    limit: number = currentLimit
  ) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: 'created_at',
        sortOrder: 'DESC'
      })

      // 필터 조건 추가
      if (filter.operationTeam) params.set('team', filter.operationTeam)
      if (filter.status) params.set('status', filter.status)
      if (filter.searchTerm) params.set('search', filter.searchTerm)

      const url = `${API_ENDPOINTS.WORK_ORDERS.LIST}?${params}`
      console.log('📡 작업지시 조회 요청:', url)
      
      const response = await apiGet(url)
      console.log('📦 작업지시 조회 응답:', response)

      // 백엔드 데이터를 프론트엔드 구조로 변환
      const workOrdersData = response.workOrders || response.data || []
      console.log('🔄 변환 전 데이터:', workOrdersData.length, '개')
      
      const mappedWorkOrders = workOrdersData.map(normalizeWorkOrder)
      console.log('✅ 변환 후 데이터:', mappedWorkOrders.length, '개')
      
      setWorkOrders(mappedWorkOrders)
      setPagination(response.pagination || null)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '작업지시 조회 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('❌ 작업지시 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [currentFilter, currentPage, currentLimit])

  // 초기 데이터 로드 및 필터/페이지 변경 시 재로드
  useEffect(() => {
    fetchWorkOrders()
  }, [fetchWorkOrders])

  // 새로운 작업지시 추가 (단일/다중)
  const addWorkOrders = async (orders: Omit<WorkOrder, 'id' | 'status' | 'createdAt' | 'updatedAt'>[]) => {
    try {
      setLoading(true)
      
      if (orders.length === 1) {
        // 단일 작업지시 생성
        const response = await apiPost(API_ENDPOINTS.WORK_ORDERS.CREATE, orders[0])
        await refreshData() // 목록 새로고침
        return { success: true, data: [response.workOrder] }
      } else {
        // 다중 작업지시 생성 - 배치로 전송
        const responses = []
        for (const order of orders) {
          try {
            const response = await apiPost(API_ENDPOINTS.WORK_ORDERS.CREATE, order)
            responses.push(response.workOrder)
          } catch (error) {
            console.error('작업지시 생성 실패:', error, order)
            // 일부 실패해도 계속 진행
          }
        }
        await refreshData() // 목록 새로고침
        return { success: true, data: responses }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '작업지시 생성 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 작업지시 상태 변경
  const updateStatus = async (id: string, status: WorkOrder['status'], notes?: string) => {
    try {
      setLoading(true)
      
      await apiPut(API_ENDPOINTS.WORK_ORDERS.UPDATE_STATUS(id), {
        status,
        notes
      })
      
      await refreshData() // 목록 새로고침
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '상태 변경 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 작업지시 삭제
  const deleteWorkOrder = async (id: string) => {
    try {
      setLoading(true)
      
      await apiDelete(API_ENDPOINTS.WORK_ORDERS.DELETE(id))
      await refreshData() // 목록 새로고침
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '작업지시 삭제 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 전체 작업지시 삭제
  const clearAllWorkOrders = async () => {
    try {
      setLoading(true)
      
      await apiDelete(API_ENDPOINTS.WORK_ORDERS.CLEAR_ALL)
      await refreshData() // 목록 새로고침
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '전체 삭제 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 회신 메모 업데이트
  const updateResponseNote = async (id: string, responseNote: Partial<ResponseNote>) => {
    try {
      setLoading(true)
      
      await apiPost(API_ENDPOINTS.WORK_ORDERS.RESPONSE_NOTES(id), responseNote)
      await refreshData() // 목록 새로고침
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 작성 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 회신 메모 확인 처리 (관리자만)
  const markResponseNoteAsChecked = async (id: string) => {
    try {
      setLoading(true)
      
      // 실제 API에서는 별도 엔드포인트가 필요할 수 있음
      // 현재는 일반 업데이트로 처리
      await apiPut(API_ENDPOINTS.WORK_ORDERS.DETAIL(id), {
        responseNote: { adminChecked: true }
      })
      
      await refreshData() // 목록 새로고침
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '회신 메모 확인 처리 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // CSV 파일 업로드
  const uploadCSV = async (file: File) => {
    try {
      setLoading(true)
      
      const response = await apiUpload(API_ENDPOINTS.WORK_ORDERS.BULK_UPLOAD, file)
      await refreshData() // 목록 새로고침
      return { success: true, data: response }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'CSV 업로드 중 오류가 발생했습니다.'
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  // 데이터 새로고침
  const refreshData = async () => {
    await fetchWorkOrders()
  }

  // 페이지 변경
  const setPage = (page: number) => {
    setCurrentPage(page)
  }

  // 필터 변경
  const setFilter = (filter: WorkOrderFilter) => {
    setCurrentFilter(filter)
    setCurrentPage(1) // 필터 변경 시 첫 페이지로
  }

  return {
    workOrders,
    loading,
    error,
    pagination,
    addWorkOrders,
    updateStatus,
    deleteWorkOrder,
    clearAllWorkOrders,
    updateResponseNote,
    markResponseNoteAsChecked,
    uploadCSV,
    refreshData,
    setPage,
    setFilter
  }
}

// 작업지시 통계 훅
export function useWorkOrderStatistics() {
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatistics = useCallback(async (team?: string) => {
    try {
      setLoading(true)
      setError(null)

      const endpoint = team 
        ? API_ENDPOINTS.TEAMS.STATS(team)
        : API_ENDPOINTS.TEAMS.ADMIN_OVERVIEW

      const response = await apiGet(endpoint)
      setStatistics(response)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '통계 조회 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('통계 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    statistics,
    loading,
    error,
    fetchStatistics
  }
}

// 완료된 회신 메모 훅 (관리자용)
export function useCompletedResponseNotes() {
  const [completedNotes, setCompletedNotes] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompletedNotes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 완료된 작업지시 중 회신 메모가 있는 것들 조회
      const params = new URLSearchParams({
        status: 'completed',
        limit: '100' // 적절한 제한
      })

      const response = await apiGet(`${API_ENDPOINTS.WORK_ORDERS.LIST}?${params}`)
      
      // 회신 메모가 있는 작업지시만 필터링
      const notesWorkOrders = response.workOrders.filter((wo: WorkOrder) => 
        wo.responseNote && Object.keys(wo.responseNote).length > 0
      )
      
      setCompletedNotes(notesWorkOrders)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '완료된 회신 메모 조회 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('완료된 회신 메모 조회 오류:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompletedNotes()
  }, [fetchCompletedNotes])

  return {
    completedNotes,
    loading,
    error,
    refreshData: fetchCompletedNotes
  }
}