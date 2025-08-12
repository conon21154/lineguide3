import { BarChart3, Users, Clock, CheckCircle, ChevronDown, ChevronRight, X, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import { useDashboardFieldReplies, useToggleFieldReplyConfirm } from '@/hooks/useDashboardFieldReplies'
import { OperationTeam, FieldReport } from '@/types'
import { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatKSTDate } from '@/utils/dateUtils'

const CalendarDayDetailModal = ({ 
  day, 
  month, 
  year, 
  workOrders, 
  onClose 
}: { 
  day: number
  month: number
  year: number
  workOrders: unknown[]
  onClose: () => void 
}) => {
  // 팀별 작업 그룹화
  const teamGroups = useMemo(() => {
    const groups: { [key: string]: unknown[] } = {}
    workOrders.forEach((wo: any) => {
      const team = wo.operationTeam
      if (!groups[team]) groups[team] = []
      groups[team].push(wo)
    })
    return groups
  }, [workOrders])

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-xl mx-2 sm:mx-4">
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            {year}년 {monthNames[month]} {day}일 작업 상세
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] sm:max-h-[calc(85vh-120px)]">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
            <div className="text-base sm:text-lg font-medium text-slate-900">
              총 {workOrders.length}건의 작업지시
            </div>
            <div className="text-sm text-slate-500">
              {Object.keys(teamGroups).length}개 운용팀
            </div>
          </div>

          <div className="space-y-6">
            {Object.entries(teamGroups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([team, teamWorkOrders]) => {
                const pendingCount = teamWorkOrders.filter(wo => wo.status === 'pending').length
                const inProgressCount = teamWorkOrders.filter(wo => wo.status === 'in_progress').length
                const completedCount = teamWorkOrders.filter(wo => wo.status === 'completed').length

                return (
                  <div key={team} className="border border-slate-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 gap-2 sm:gap-0">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-[#1E40AF]/10 text-[#1E40AF]">
                          {team}
                        </span>
                        <span className="text-base sm:text-lg font-medium text-slate-900">
                          {teamWorkOrders.length}건
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 sm:gap-2 text-xs">
                        {pendingCount > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            대기 {pendingCount}
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="px-2 py-1 bg-[#1E40AF]/10 text-[#1E40AF] rounded">
                            진행중 {inProgressCount}
                          </span>
                        )}
                        {completedCount > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            완료 {completedCount}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {teamWorkOrders.map(wo => (
                        <div key={wo.id} className="bg-slate-50 p-2 sm:p-3 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0">
                            <div className="flex-1">
                              <div className="font-mono text-xs bg-white px-2 py-1 rounded inline-block mb-1">
                                {wo.managementNumber.replace(/_DU측|_RU측/g, '')}
                              </div>
                              <div className="text-sm font-medium">{wo.equipmentName}</div>
                              <div className="text-xs text-slate-600">{wo.concentratorName5G}</div>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded self-start ${                              wo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              wo.status === 'in_progress' ? 'bg-[#1E40AF]/10 text-[#1E40AF]' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {wo.status === 'pending' ? '대기' : wo.status === 'in_progress' ? '진행중' : '완료'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            }
          </div>
        </div>
      </div>
    </div>
  )
}

// 간단한 캘린더 컴포넌트
const SimpleCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<{
    day: number
    month: number
    year: number
    workOrders: unknown[]
  } | null>(null)

  const { workOrders } = useWorkOrdersAPI() // 실제 작업지시 데이터 가져오기
  
  // 작업지시가 있는 첫 번째 월로 캘린더 초기화
  useEffect(() => {
    if (workOrders.length > 0 && !selectedDay) {
      const firstWorkOrder = workOrders[0]
      const dateValue = firstWorkOrder.requestDate || firstWorkOrder.createdAt
      if (dateValue) {
        try {
          let workDate: Date
          if (typeof dateValue === 'string') {
            // 한국어 날짜 형식 처리
            const koreanDateMatch = dateValue.match(/(\d{2})월(\d{2})일/)
            if (koreanDateMatch) {
              const month = parseInt(koreanDateMatch[1], 10) - 1 // 0-based month
              const day = parseInt(koreanDateMatch[2], 10)
              const currentYear = new Date().getFullYear()
              workDate = new Date(currentYear, month, day)
            } else {
              // 기존 형식들 처리
              const normalizedDate = dateValue.replace(/[./]/g, '-')
              workDate = new Date(normalizedDate)
            }
          } else {
            workDate = new Date(dateValue)
          }
          
          if (!isNaN(workDate.getTime())) {
            setCurrentDate(new Date(workDate.getFullYear(), workDate.getMonth(), 1))
            // console.log('📅 캘린더를 작업 데이터가 있는 월로 이동:', workDate.toISOString().split('T')[0])
          }
        } catch (error) {
          console.warn('캘린더 초기화 오류:', error)
        }
      }
    }
  }, [workOrders, selectedDay])
  
  // 팀별 색상 매핑
  const getTeamColor = (team: string): string => {
    const colorMap: { [key: string]: string } = {
      '울산T': 'bg-red-100 text-red-800',
      '동부산T': 'bg-blue-100 text-blue-800', 
      '중부산T': 'bg-green-100 text-green-800',
      '서부산T': 'bg-purple-100 text-purple-800',
      '김해T': 'bg-yellow-100 text-yellow-800',
      '창원T': 'bg-indigo-100 text-indigo-800',
      '진주T': 'bg-pink-100 text-pink-800',
      '통영T': 'bg-orange-100 text-orange-800',
      '지하철T': 'bg-gray-100 text-gray-800',
      '기타': 'bg-gray-100 text-gray-800'
    }
    return colorMap[team] || 'bg-gray-100 text-gray-800'
  }

  // 현재 월의 첫 번째 날과 마지막 날 구하기
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // 이전 달로 이동
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  // 다음 달로 이동
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // 특정 날짜의 작업지시 가져오기
  const getWorkOrdersForDate = (year: number, month: number, day: number) => {
    const targetDate = new Date(year, month, day)
    const dateString = targetDate.toISOString().split('T')[0] // YYYY-MM-DD 형식
    
    const matchedOrders = workOrders.filter(workOrder => {
      try {
        // 작업요청일 또는 생성일로 필터링 - 안전한 날짜 파싱
        const dateValue = workOrder.requestDate || workOrder.createdAt
        if (!dateValue) return false
        
        // 다양한 날짜 형식 지원
        let workOrderDate: Date
        
        if (typeof dateValue === 'string') {
          // 한국어 날짜 형식 처리 (예: "08월06일(수) 내", "07월31일(목) 내")
          const koreanDateMatch = dateValue.match(/(\d{2})월(\d{2})일/)
          if (koreanDateMatch) {
            const month = parseInt(koreanDateMatch[1], 10) - 1 // 0-based month
            const day = parseInt(koreanDateMatch[2], 10)
            const currentYear = new Date().getFullYear()
            workOrderDate = new Date(currentYear, month, day)
          } else {
            // 기존 형식들 처리 (예: "2024.01.15", "2024/01/15", "2024-01-15")
            const normalizedDate = dateValue.replace(/[./]/g, '-')
            workOrderDate = new Date(normalizedDate)
          }
        } else {
          workOrderDate = new Date(dateValue)
        }
        
        if (isNaN(workOrderDate.getTime())) return false // 유효하지 않은 날짜 체크
        
        const workOrderDateString = workOrderDate.toISOString().split('T')[0]
        const isMatch = workOrderDateString === dateString
        
        // 매칭된 경우 디버깅 로그 (필요시에만 활성화)
        // if (isMatch) {
        //   console.log(`📅 날짜 매칭: ${dateString} = ${workOrderDateString} (원본: ${dateValue})`)
        // }
        
        return isMatch
      } catch (error) {
        console.warn('날짜 파싱 오류:', workOrder, error)
        return false
      }
    })
    
    // 디버깅: 특정 날짜 조회시 결과 출력 (필요시에만 활성화)
    // if (day === 1 && matchedOrders.length === 0) {
    //   console.log(`🔍 ${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} 검색 결과: ${matchedOrders.length}개`)
    //   console.log('📋 전체 작업지시 날짜들:', workOrders.map(wo => wo.requestDate || wo.createdAt))
    // }
    
    return matchedOrders
  }


  // 날짜 클릭 핸들러
  const handleDayClick = (day: number) => {
    const dayWorkOrders = getWorkOrdersForDate(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDay({
      day,
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      workOrders: dayWorkOrders
    })
  }

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div>
      {/* 캘린더 헤더 */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-medium text-slate-900">작업 캘린더</h3>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1 sm:p-2 hover:bg-slate-100 rounded"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <span className="font-medium text-sm sm:text-base px-2">
            {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1 sm:p-2 hover:bg-slate-100 rounded"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 캘린더 그리드 */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center">
        {/* 요일 헤더 */}
        {weekDays.map(day => (
          <div key={day} className="p-1 sm:p-2 text-xs sm:text-sm font-medium text-slate-500">
            {day}
          </div>
        ))}

        {/* 빈 셀들 (이전 달의 마지막 날들) */}
        {Array.from({ length: firstDayWeekday }, (_, i) => (
          <div key={`empty-${i}`} className="p-0.5 sm:p-1 h-12 sm:h-16"></div>
        ))}

        {/* 현재 달의 날짜들 */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1
          const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
          const dayWorkOrders = getWorkOrdersForDate(currentDate.getFullYear(), currentDate.getMonth(), day)
          const workCount = dayWorkOrders.length
          
          // 해당 날짜의 운용팀별 작업 수 계산
          const teamCounts: { [key: string]: number } = {}
          dayWorkOrders.forEach(wo => {
            teamCounts[wo.operationTeam] = (teamCounts[wo.operationTeam] || 0) + 1
          })
          
          const teams = Object.keys(teamCounts)
          
          return (
            <div
              key={day}
              onClick={() => handleDayClick(day)}
              className={`relative p-0.5 sm:p-1 h-12 sm:h-16 text-xs sm:text-sm cursor-pointer hover:bg-slate-50 rounded border transition-colors ${
                isToday ? 'bg-[#1E40AF]/10 border-[#1E40AF]/20 text-[#1E40AF] font-medium' : 'border-slate-100'
              } ${workCount > 0 ? 'hover:shadow-sm' : ''}`}
            >
              <div className="font-medium mb-0.5 sm:mb-1">{day}</div>
              
              {/* 작업 수 표시 */}
              {workCount > 0 && (
                <div className="space-y-0.5 sm:space-y-1">
                  {teams.slice(0, window.innerWidth < 640 ? 1 : 2).map(team => (
                    <div
                      key={team}
                      className={`inline-flex items-center px-0.5 sm:px-1 py-0.5 rounded text-xs font-medium ${getTeamColor(team)}`}
                    >
                      {team.replace('T', '')} {teamCounts[team]}
                    </div>
                  ))}
                  {teams.length > (window.innerWidth < 640 ? 1 : 2) && (
                    <div className="text-xs text-slate-500">
                      +{teams.length - (window.innerWidth < 640 ? 1 : 2)}팀
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDay && (
        <CalendarDayDetailModal
          day={selectedDay.day}
          month={selectedDay.month}
          year={selectedDay.year}
          workOrders={selectedDay.workOrders}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

export default function Dashboard() {
  // 대시보드에서는 작업지시 자동 재조회로 인한 불필요 트리거를 방지
  const { workOrders } = useWorkOrdersAPI(undefined, 1, 200, { autoFetch: true })
  const [expandedTeams, setExpandedTeams] = useState<Set<OperationTeam>>(new Set())
  
  // 대시보드 전용 현장 회신 데이터 (실시간 반영)
  const { data: fieldRepliesData, isLoading: loadingReports } = useDashboardFieldReplies()
  const toggleConfirmMutation = useToggleFieldReplyConfirm()
  
  // 기존 fieldReports 호환성을 위한 변환
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([])
  
  useEffect(() => {
    if (fieldRepliesData?.success && fieldRepliesData.data.recent) {
      console.log('🔄 Dashboard useEffect 트리거 - fieldRepliesData 변경됨');
      
      // 새 API 형식을 기존 FieldReport 형식으로 변환
      const convertedReports: FieldReport[] = fieldRepliesData.data.recent.map(item => {
        const isChecked = !!item.confirmedAt;
        
        // 개발 환경에서 변환 과정 디버깅 (샘플링으로 로그 축소)
        if (Math.random() < 0.2) { // 20% 확률로만 로그
          console.log('🔄 Dashboard 데이터 변환 (샘플):', {
            id: item.id,
            confirmedAt: item.confirmedAt,
            adminChecked: isChecked
          });
        }
        
        return {
          id: item.id,
          workOrderId: item.workOrderId,
          managementNumber: item.workOrderId, // 관리번호는 별도 조회 필요하지만 임시로 workOrderId 사용
          operationTeam: 'Unknown', // 팀 정보는 별도 조회 필요
          equipmentName: '',
          representativeRuId: item.ruId || '',
          summary: item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content,
          status: 'completed',
          createdAt: item.createdAt || new Date().toISOString(), // 기본값으로 현재 시간 사용
          createdBy: item.createdBy,
          adminChecked: isChecked,
          adminCheckedAt: item.confirmedAt
        };
      });
      
      console.log('✅ Dashboard 데이터 변환 완료:', convertedReports.length + '개');
      setFieldReports(convertedReports)
    }
  }, [fieldRepliesData])

  // 관리자 확인 토글 (새 API 사용)
  const handleToggleCheck = async (reportId: string, checked: boolean) => {
    try {
      console.log('🖱️ Dashboard 확인 버튼 클릭:', { reportId, checked });
      await toggleConfirmMutation.mutateAsync({ id: reportId, confirmed: checked });
      console.log('✅ Dashboard 확인 상태 변경 완료');
    } catch (error) {
      console.error('❌ Dashboard 관리자 확인 처리 실패:', error);
    }
  }

  // API 데이터로부터 통계 계산
  const statistics = useMemo(() => {
    const total = workOrders.length;
    const pending = workOrders.filter(o => o.status === 'pending').length;
    const inProgress = workOrders.filter(o => o.status === 'in_progress').length;
    const completed = workOrders.filter(o => o.status === 'completed').length;

    const byTeam: Record<OperationTeam, { pending: number; inProgress: number; completed: number }> = {
      '울산T': { pending: 0, inProgress: 0, completed: 0 },
      '동부산T': { pending: 0, inProgress: 0, completed: 0 },
      '중부산T': { pending: 0, inProgress: 0, completed: 0 },
      '서부산T': { pending: 0, inProgress: 0, completed: 0 },
      '김해T': { pending: 0, inProgress: 0, completed: 0 },
      '창원T': { pending: 0, inProgress: 0, completed: 0 },
      '진주T': { pending: 0, inProgress: 0, completed: 0 },
      '통영T': { pending: 0, inProgress: 0, completed: 0 },
      '지하철T': { pending: 0, inProgress: 0, completed: 0 },
      '기타': { pending: 0, inProgress: 0, completed: 0 }
    };

    workOrders.forEach(order => {
      const team = order.operationTeam as OperationTeam;
      if (byTeam[team]) {
        const status = order.status === 'in_progress' ? 'inProgress' : order.status;
        byTeam[team][status]++;
      }
    });

    // DU/RU 작업 분리 통계
    const duRuStats: Record<OperationTeam, { 
      duWork: { pending: number; inProgress: number; completed: number; total: number };
      ruWork: { pending: number; inProgress: number; completed: number; total: number };
    }> = {} as Record<OperationTeam, { 
      duWork: { pending: number; inProgress: number; completed: number; total: number };
      ruWork: { pending: number; inProgress: number; completed: number; total: number };
    }>;

    Object.keys(byTeam).forEach(team => {
      const operationTeam = team as OperationTeam;
      duRuStats[operationTeam] = {
        duWork: { pending: 0, inProgress: 0, completed: 0, total: 0 },
        ruWork: { pending: 0, inProgress: 0, completed: 0, total: 0 }
      };
    });

    workOrders.forEach(order => {
      const team = order.operationTeam as OperationTeam;
      if (!duRuStats[team]) return;
      
      const isDuWork = order.workType === 'DU측' || order.managementNumber?.includes('_DU측');
      const isRuWork = order.workType === 'RU측' || order.managementNumber?.includes('_RU측');
      
      if (isDuWork) {
        const statusKey = order.status === 'in_progress' ? 'inProgress' : order.status;
        duRuStats[team].duWork[statusKey]++;
        duRuStats[team].duWork.total++;
      } else if (isRuWork) {
        const statusKey = order.status === 'in_progress' ? 'inProgress' : order.status;
        duRuStats[team].ruWork[statusKey]++;
        duRuStats[team].ruWork.total++;
      }
    });

    return {
      total,
      pending,
      inProgress,
      completed,
      byTeam,
      duRuStats
    };
  }, [workOrders])

  // 디버깅용 로그 (필요시에만 활성화)
  // console.log('📊 Dashboard Statistics:', statistics)
  // console.log('📋 Work Orders:', workOrders)
  // console.log('📅 First Work Order Date:', workOrders.length > 0 ? workOrders[0].requestDate : 'No data')

  // DU/RU 통계가 있는 팀들만 필터링
  const activeDuRuTeams = statistics.duRuStats ? Object.keys(statistics.duRuStats).filter(team => {
    const duRuStat = statistics.duRuStats![team as OperationTeam]
    return duRuStat && (duRuStat.duWork.total > 0 || duRuStat.ruWork.total > 0)
  }) : []

  // 현장회신 통계 계산 (새 API 사용)
  const fieldReportStats = useMemo(() => {
    if (fieldRepliesData?.success) {
      return {
        total: fieldRepliesData.data.totals.all,
        unchecked: fieldRepliesData.data.totals.unconfirmed,
        checked: fieldRepliesData.data.totals.confirmed,
        recent: fieldRepliesData.data.totals.last24h
      }
    }
    return { total: 0, unchecked: 0, checked: 0, recent: 0 }
  }, [fieldRepliesData])

  // 중복 현장회신 탐지 (관리번호 + 요약 기준)
  const duplicateReports = useMemo(() => {
    const reportMap = new Map<string, FieldReport[]>()
    
    fieldReports.forEach(report => {
      const key = `${report.managementNumber}-${report.summary.trim().slice(0, 50)}`
      if (!reportMap.has(key)) {
        reportMap.set(key, [])
      }
      reportMap.get(key)!.push(report)
    })
    
    return Array.from(reportMap.values()).filter(reports => reports.length > 1)
  }, [fieldReports])

  const toggleTeamExpand = (team: OperationTeam) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(team)) {
      newExpanded.delete(team)
    } else {
      newExpanded.add(team)
    }
    setExpandedTeams(newExpanded)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 bg-slate-50">
      <PageHeader
        title="대시보드"
        subtitle="작업지시 현황을 한눈에 확인하세요"
      />

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-slate-400" />
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs sm:text-sm font-medium text-slate-500 truncate">전체 작업</dt>
                <dd className="text-base sm:text-lg font-medium text-slate-900">{statistics.total.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs sm:text-sm font-medium text-slate-500 truncate">대기 중</dt>
                <dd className="text-base sm:text-lg font-medium text-slate-900">{statistics.pending.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-[#1E40AF]" />
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs sm:text-sm font-medium text-slate-500 truncate">진행 중</dt>
                <dd className="text-base sm:text-lg font-medium text-slate-900">{statistics.inProgress.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="ml-3 sm:ml-5 w-0 flex-1">
              <dl>
                <dt className="text-xs sm:text-sm font-medium text-slate-500 truncate">완료</dt>
                <dd className="text-base sm:text-lg font-medium text-slate-900">{statistics.completed.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* 팀별 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-3 sm:mb-4">운용팀별 현황</h3>
          <div className="space-y-4">
            {(() => {
              const teamsWithWork = Object.entries(statistics.byTeam)
                .filter(([, stats]) => (stats.pending + stats.inProgress + stats.completed) > 0)
                .sort(([a], [b]) => a.localeCompare(b));
              
              if (teamsWithWork.length === 0) {
                return (
                  <div className="text-center py-8">
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
                );
              }
              
              return teamsWithWork.map(([team, stats]) => (
                <div key={team} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 bg-slate-50 rounded-lg gap-2 sm:gap-0">
                  <div className="font-medium text-slate-900">{team}</div>
                  <div className="flex flex-wrap gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                      대기 {stats.pending}
                    </span>
                    <span className="px-2 py-1 bg-[#1E40AF]/10 text-[#1E40AF] rounded">
                      진행 {stats.inProgress}
                    </span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      완료 {stats.completed}
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>

        {/* DU/RU 분리 통계 */}
        <Card>
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-3 sm:mb-4">DU/RU 작업 분리 현황</h3>
          <div className="space-y-3">
            {activeDuRuTeams.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-slate-400 mb-4">
                  <BarChart3 className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  DU/RU 작업 데이터가 없습니다
                </h3>
                <p className="text-slate-600">
                  작업지시를 등록하면 DU/RU별 통계가 표시됩니다
                </p>
              </div>
            ) : (
              activeDuRuTeams.map(team => {
              const duRuStat = statistics.duRuStats![team as OperationTeam]
              const duTotal = duRuStat.duWork.total
              const ruTotal = duRuStat.ruWork.total
              const isExpanded = expandedTeams.has(team as OperationTeam)

              if (duTotal === 0 && ruTotal === 0) return null

              return (
                <div key={team} className="border border-slate-200 rounded-lg">
                  <div 
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                    onClick={() => toggleTeamExpand(team as OperationTeam)}
                  >
                    <div className="flex items-center space-x-2">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="font-medium text-slate-900">{team}</span>
                    </div>
                    <div className="text-sm text-slate-600">
                      총 {duTotal + ruTotal}건
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {duTotal > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              DU측
                            </span>
                            <span className="text-sm text-slate-600">{duTotal}건</span>
                          </div>
                          <div className="flex space-x-2 text-xs">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                              대기 {duRuStat.duWork.pending}
                            </span>
                            <span className="px-2 py-1 bg-[#1E40AF]/10 text-[#1E40AF] rounded">
                              진행 {duRuStat.duWork.inProgress}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              완료 {duRuStat.duWork.completed}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {ruTotal > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                              RU측
                            </span>
                            <span className="text-sm text-slate-600">{ruTotal}건</span>
                          </div>
                          <div className="flex space-x-2 text-xs">
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                              대기 {duRuStat.ruWork.pending}
                            </span>
                            <span className="px-2 py-1 bg-[#1E40AF]/10 text-[#1E40AF] rounded">
                              진행 {duRuStat.ruWork.inProgress}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                              완료 {duRuStat.ruWork.completed}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
            )}
          </div>
        </Card>
      </div>

      {/* 현장회신 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* 현장회신 통계 */}
        <Card>
          <h3 className="text-base sm:text-lg font-medium text-slate-900 mb-3 sm:mb-4">현장회신 현황</h3>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-[#1E40AF]">{fieldReportStats.total}</div>
              <div className="text-xs sm:text-sm text-slate-600">총 회신</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-orange-600">{fieldReportStats.unchecked}</div>
              <div className="text-xs sm:text-sm text-slate-600">미확인</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{fieldReportStats.checked}</div>
              <div className="text-xs sm:text-sm text-slate-600">확인완료</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{fieldReportStats.recent}</div>
              <div className="text-xs sm:text-sm text-slate-600">24시간 내</div>
            </div>
          </div>

          {/* 중복 회신 경고 */}
          {duplicateReports.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">
                  {duplicateReports.length}건의 중복 가능성이 있는 회신
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* 최근 현장회신 */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-0">
            <h3 className="text-base sm:text-lg font-medium text-slate-900">최근 현장회신</h3>
            <div className="flex items-center gap-2 sm:gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-orange-100 border border-orange-300 rounded"></div>
                <span className="text-slate-600">미확인</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-slate-600">확인완료</span>
              </div>
            </div>
          </div>
          
          {loadingReports ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#1E40AF] mx-auto"></div>
            </div>
          ) : fieldReports.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-600">현장회신이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fieldReports.slice(0, 5).map(report => {
                const isChecked = (report as {adminChecked?: boolean}).adminChecked;
                const isProcessing = toggleConfirmMutation.isPending;
                
                // 디버깅: 버튼 클릭 시에만 로그 (렌더링마다 로그 방지)
                if (process.env.NODE_ENV === 'development' && isProcessing) {
                  console.log(`🖼️ Dashboard 렌더링 중 - Report ${report.id}:`, {
                    adminChecked: (report as {adminChecked?: boolean}).adminChecked,
                    isChecked,
                    isProcessing
                  });
                }
                
                return (
                  <div key={report.id} className={`p-2 sm:p-3 rounded-lg border-l-4 transition-all duration-200 ${
                    isChecked 
                      ? 'bg-green-50 border-l-green-400' 
                      : 'bg-orange-50 border-l-orange-400'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                          <span className="text-xs font-mono bg-white px-2 py-1 rounded shadow-sm">
                            {report.managementNumber}
                          </span>
                          <span className="text-xs text-slate-500 hidden sm:inline">{report.operationTeam}</span>
                          
                          {/* 상태 배지 */}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isChecked
                              ? 'bg-green-100 text-green-700 border border-green-200'
                              : 'bg-orange-100 text-orange-700 border border-orange-200'
                          }`}>
                            {isChecked ? '✓ 확인완료' : '⏳ 미확인'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-700 line-clamp-2 mb-2">
                          {report.summary.slice(0, 80)}...
                        </p>
                        
                        <div className="text-xs text-slate-500">
                          <span>📝 작성: {
                            report.createdAt && report.createdAt !== null 
                              ? formatKSTDate(report.createdAt, true)
                              : '등록일 확인 중...'
                          }</span>
                          {isChecked && (report as {adminCheckedAt?: string}).adminCheckedAt && (
                            <span className="ml-3">✅ 확인: {formatKSTDate((report as {adminCheckedAt?: string}).adminCheckedAt!, true)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="sm:ml-3 flex items-center">
                        <button
                          onClick={() => {
                            console.log('🖱️ 버튼 클릭 - Before:', { 
                              reportId: report.id, 
                              currentChecked: isChecked, 
                              willChangeTo: !isChecked 
                            });
                            handleToggleCheck(report.id, !isChecked);
                          }}
                          disabled={isProcessing}
                          className={`relative px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                            isChecked
                              ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
                              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={isChecked ? '미확인으로 변경' : '확인 완료로 변경'}
                        >
                          {isProcessing ? (
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>처리중</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              {isChecked ? (
                                <>
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>확인완료</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4" />
                                  <span>확인하기</span>
                                </>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {fieldReports.length > 5 && (
                <div className="text-center pt-2">
                  <a href="/board" className="text-[#1E40AF] hover:text-[#1E3A8A] text-sm font-medium">
                    전체 {fieldReports.length}건 보기 →
                  </a>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* 캘린더 */}
      <Card>
        <SimpleCalendar />
      </Card>
    </div>
  )
}