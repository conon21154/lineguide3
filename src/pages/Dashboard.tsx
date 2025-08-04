import { BarChart3, Users, Clock, CheckCircle, MessageSquare, Eye, ChevronDown, ChevronRight, Calendar, TrendingUp, X, Check, Minus } from 'lucide-react'
import { useWorkOrderStatistics, useWorkOrders, useCompletedResponseNotes } from '@/hooks/useWorkOrders'
import { OperationTeam, WorkOrder } from '@/types'
import { useState, useMemo } from 'react'

const ResponseNoteViewModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측'
  const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 메모 - 완료</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <Eye className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              [{workOrder.operationTeam} {workType}]
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">ㅇ 관리번호 :</span> {baseManagementNumber}
              </div>
              <div>
                <span className="font-medium">ㅇ 국사 명 :</span> {workOrder.concentratorName5G}
              </div>
              {workType === 'RU측' && (
                <div>
                  <span className="font-medium">ㅇ 국소 명 :</span> {workOrder.equipmentName}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {workOrder.responseNote?.ruOpticalSignal && (
              <div>
                <span className="font-medium">ㅇ RU 광신호 유/무 :</span> {workOrder.responseNote.ruOpticalSignal}
              </div>
            )}

            {workType === 'DU측' && workOrder.responseNote?.mux5G && (
              <div>
                <span className="font-medium">ㅇ 5G MUX :</span> {workOrder.responseNote.mux5G}
              </div>
            )}

            {workType === 'DU측' && workOrder.responseNote?.tie5GLine && (
              <div>
                <span className="font-medium">ㅇ 5G TIE 선번 :</span> {workOrder.responseNote.tie5GLine}
              </div>
            )}

            <div>
              <span className="font-medium">ㅇ 특이사항 :</span> {workOrder.responseNote?.specialNotes || '없음'}
            </div>

            <div className="text-xs text-gray-500 pt-2 border-t">
              회신 작성일: {workOrder.responseNote?.updatedAt ? new Date(workOrder.responseNote.updatedAt).toLocaleString() : '-'}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button onClick={onClose} className="btn btn-secondary">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

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
  workOrders: WorkOrder[]
  onClose: () => void 
}) => {
  // 팀별 작업 그룹화
  const teamGroups = useMemo(() => {
    const groups: { [key: string]: WorkOrder[] } = {}
    workOrders.forEach(wo => {
      const team = wo.operationTeam
      if (!groups[team]) groups[team] = []
      groups[team].push(wo)
    })
    return groups
  }, [workOrders])

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {year}년 {monthNames[month]} {day}일 작업 상세
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-lg font-medium text-gray-900">
              총 {workOrders.length}건의 작업지시
            </div>
            <div className="text-sm text-gray-500">
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
                  <div key={team} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {team}
                        </span>
                        <span className="text-lg font-medium text-gray-900">
                          {teamWorkOrders.length}건
                        </span>
                      </div>
                      <div className="flex space-x-2 text-xs">
                        {pendingCount > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                            대기 {pendingCount}
                          </span>
                        )}
                        {inProgressCount > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                            진행 {inProgressCount}
                          </span>
                        )}
                        {completedCount > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                            완료 {completedCount}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {teamWorkOrders.map((workOrder) => {
                        const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 
                                        workOrder.managementNumber.includes('_RU측') ? 'RU측' : ''
                        const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                        
                        return (
                          <div key={workOrder.id} className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {workType && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    workType === 'DU측' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                  }`}>
                                    {workType}
                                  </span>
                                )}
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  workOrder.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : workOrder.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {workOrder.status === 'pending' ? '대기' : 
                                   workOrder.status === 'in_progress' ? '진행중' : '완료'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-1 text-sm">
                              <div className="font-medium text-gray-900 truncate">
                                {workOrder.equipmentName}
                              </div>
                              <div className="text-xs text-gray-500">
                                관리번호: {baseManagementNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                집중국: {workOrder.concentratorName5G}
                              </div>
                              {workOrder.responseNote && (
                                <div className="text-xs text-blue-600">
                                  📝 회신메모 작성됨
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn btn-secondary">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

const SimpleCalendar = () => {
  const { workOrders } = useWorkOrders()
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const [selectedDay, setSelectedDay] = useState<{ day: number, workOrders: WorkOrder[] } | null>(null)
  
  // 작업요청일 파싱 함수 - 더 유연한 파싱
  const parseRequestDate = (requestDate: string) => {
    try {
      console.log('파싱할 날짜:', requestDate)
      
      // 여러 가지 형식 시도
      // 1. "08월06일(수) 내" 형식
      let matches = requestDate.match(/(\d{1,2})월(\d{1,2})일/)
      if (matches) {
        const month = parseInt(matches[1], 10) - 1
        const day = parseInt(matches[2], 10)
        const date = new Date(currentYear, month, day)
        console.log('파싱된 날짜:', date)
        return date
      }
      
      // 2. "2024-08-06" 형식
      matches = requestDate.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
      if (matches) {
        const year = parseInt(matches[1], 10)
        const month = parseInt(matches[2], 10) - 1
        const day = parseInt(matches[3], 10)
        return new Date(year, month, day)
      }
      
      // 3. 기타 형식 시도
      const date = new Date(requestDate)
      if (!isNaN(date.getTime())) {
        return date
      }
      
      console.log('날짜 파싱 실패:', requestDate)
      return null
    } catch (error) {
      console.log('날짜 파싱 에러:', error)
      return null
    }
  }
  
  // 이번 달 작업일정 생성
  const workDates = useMemo(() => {
    const dates: { [key: number]: WorkOrder[] } = {}
    
    console.log('전체 작업지시 수:', workOrders.length)
    
    workOrders.forEach((wo, index) => {
      if (index < 5) { // 첫 5개만 로그
        console.log(`작업지시[${index}]:`, wo.requestDate, wo.operationTeam)
      }
      
      const requestDate = parseRequestDate(wo.requestDate)
      
      if (requestDate && 
          requestDate.getMonth() === currentMonth && 
          requestDate.getFullYear() === currentYear) {
        const day = requestDate.getDate()
        if (!dates[day]) dates[day] = []
        dates[day].push(wo)
        console.log(`${day}일에 작업 추가:`, wo.operationTeam)
      }
    })
    
    console.log('캘린더 작업 데이터:', dates)
    return dates
  }, [workOrders, currentMonth, currentYear])

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  
  const calendarDays = []
  
  // 빈 칸 추가
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(<div key={`empty-${i}`} className="h-12"></div>)
  }
  
  // 실제 날짜들
  for (let day = 1; day <= daysInMonth; day++) {
    const dayWorkOrders = workDates[day] || []
    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()
    
    const totalCount = dayWorkOrders.length
    
    // 작업 강도에 따른 색상 결정
    const getWorkIntensityColor = (count: number) => {
      if (count === 0) return ''
      if (count <= 3) return 'bg-green-100 border-green-300'
      if (count <= 7) return 'bg-yellow-100 border-yellow-300'
      if (count <= 15) return 'bg-orange-100 border-orange-300'
      return 'bg-red-100 border-red-300'
    }
    
    const intensityColor = getWorkIntensityColor(totalCount)
    
    calendarDays.push(
      <div 
        key={day} 
        className={`h-12 text-sm relative p-1 border transition-all duration-200 ${
          isToday ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-300' : 
          totalCount > 0 ? `${intensityColor} cursor-pointer hover:shadow-md` : 
          'border-gray-200 hover:bg-gray-50'
        }`}
        onClick={() => totalCount > 0 && setSelectedDay({ day, workOrders: dayWorkOrders })}
      >
        <span className={`absolute top-1 left-1 font-medium ${
          totalCount > 0 ? 'text-gray-800' : 'text-gray-600'
        }`}>
          {day}
        </span>
        
        {totalCount > 0 && (
          <div className="absolute top-1 right-1">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-gray-800 text-white">
              {totalCount > 99 ? '99+' : totalCount}
            </span>
          </div>
        )}
        
        {totalCount > 0 && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 rounded transition-opacity">
            <span className="text-xs text-gray-800 font-medium bg-white px-2 py-1 rounded shadow">
              상세보기
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">
            {currentYear}년 {currentMonth + 1}월 작업일정
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          총 {workOrders.length}건의 작업지시
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1 text-center">
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 p-2 border-b">{day}</div>
        ))}
        {calendarDays}
      </div>
      
      <div className="mt-4 space-y-2">
        <div className="text-sm font-medium text-gray-700">작업 강도 범례</div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-gray-600">1-3건 (적음)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">4-7건 (보통)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
            <span className="text-gray-600">8-15건 (많음)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-gray-600">16건+ (매우 많음)</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 pt-1">
          💡 작업이 있는 날짜를 클릭하면 상세 내역을 확인할 수 있습니다
        </div>
      </div>
      
      {selectedDay && (
        <CalendarDayDetailModal
          day={selectedDay.day}
          month={currentMonth}
          year={currentYear}
          workOrders={selectedDay.workOrders}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}

export default function Dashboard() {
  const statistics = useWorkOrderStatistics()
  const { markResponseNoteAsChecked } = useWorkOrders()
  const completedResponseNotes = useCompletedResponseNotes()
  const [viewingResponseNote, setViewingResponseNote] = useState<WorkOrder | null>(null)
  const [expandedTeams, setExpandedTeams] = useState<Set<OperationTeam>>(new Set())
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())

  // DU/RU 통계가 있는 팀들만 필터링
  const activeDuRuTeams = statistics.duRuStats ? Object.keys(statistics.duRuStats).filter(team => {
    const duRuStat = statistics.duRuStats![team as OperationTeam]
    return duRuStat && (duRuStat.duWork.total > 0 || duRuStat.ruWork.total > 0)
  }) as OperationTeam[] : []

  // 팀별 완료율 계산
  const teamCompletionRates = useMemo(() => {
    const rates: { [key: string]: number } = {}
    if (statistics.duRuStats) {
      Object.entries(statistics.duRuStats).forEach(([team, stat]) => {
        const totalWork = stat.duWork.total + stat.ruWork.total
        const completedWork = stat.duWork.completed + stat.ruWork.completed
        rates[team] = totalWork > 0 ? Math.round((completedWork / totalWork) * 100) : 0
      })
    }
    return rates
  }, [statistics.duRuStats])

  const toggleTeamExpansion = (team: OperationTeam) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(team)) {
      newExpanded.delete(team)
    } else {
      newExpanded.add(team)
    }
    setExpandedTeams(newExpanded)
  }

  const toggleResponseTeamCollapse = (team: string) => {
    const newCollapsed = new Set(collapsedTeams)
    if (newCollapsed.has(team)) {
      newCollapsed.delete(team)
    } else {
      newCollapsed.add(team)
    }
    setCollapsedTeams(newCollapsed)
  }

  const handleMarkAsChecked = async (workOrderId: string) => {
    await markResponseNoteAsChecked(workOrderId)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="mt-2 text-gray-600">
          작업지시 현황을 한눈에 확인하세요
        </p>
      </div>

      {/* 전체 통계 카드 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BarChart3 className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">전체 작업</dt>
                <dd className="text-lg font-medium text-gray-900">{statistics.total.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-6 w-6 text-warning-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">대기중</dt>
                <dd className="text-lg font-medium text-gray-900">{statistics.pending.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-primary-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">진행중</dt>
                <dd className="text-lg font-medium text-gray-900">{statistics.inProgress.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-6 w-6 text-success-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">완료</dt>
                <dd className="text-lg font-medium text-gray-900">{statistics.completed.toLocaleString()}</dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 운용팀별 작업 현황 (클릭 확장형) */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900">운용팀별 작업 현황</h3>
          </div>
          <div className="space-y-3">
            {activeDuRuTeams.length > 0 ? (
              activeDuRuTeams
                .sort((a, b) => a.localeCompare(b))
                .map((team) => {
                  const duRuStat = statistics.duRuStats![team]
                  const duTotal = duRuStat.duWork.total
                  const ruTotal = duRuStat.ruWork.total
                  const completionRate = teamCompletionRates[team] || 0
                  const isExpanded = expandedTeams.has(team)
                  
                  return (
                    <div key={team} className="border rounded-lg">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleTeamExpansion(team)}
                      >
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {team}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            총 {duTotal + ruTotal}건
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{completionRate}%</div>
                            <div className="text-xs text-gray-500">완료율</div>
                          </div>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="border-t bg-gray-50 p-3 space-y-2">
                          {duTotal > 0 && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                  DU측
                                </span>
                                <span className="text-sm text-gray-600">{duTotal}건</span>
                              </div>
                              <div className="flex space-x-2 text-xs">
                                <span className="px-2 py-1 bg-warning-100 text-warning-800 rounded">
                                  대기 {duRuStat.duWork.pending}
                                </span>
                                <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded">
                                  진행 {duRuStat.duWork.inProgress}
                                </span>
                                <span className="px-2 py-1 bg-success-100 text-success-800 rounded">
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
                                <span className="text-sm text-gray-600">{ruTotal}건</span>
                              </div>
                              <div className="flex space-x-2 text-xs">
                                <span className="px-2 py-1 bg-warning-100 text-warning-800 rounded">
                                  대기 {duRuStat.ruWork.pending}
                                </span>
                                <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded">
                                  진행 {duRuStat.ruWork.inProgress}
                                </span>
                                <span className="px-2 py-1 bg-success-100 text-success-800 rounded">
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
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">운용팀별 작업지시가 없습니다</p>
                <p className="text-sm text-gray-400 mt-1">Excel 파일을 업로드하면 팀별 통계가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 캘린더 */}
        <SimpleCalendar />
      </div>

      {/* 완료된 현장 회신 메모 섹션 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">완료된 현장 회신 메모</h3>
          <span className="text-sm text-gray-500">{completedResponseNotes.length}건</span>
        </div>
        
        {completedResponseNotes.length > 0 ? (
          <div className="space-y-4">
            {(() => {
              // 팀별로 그룹화하고 확인되지 않은 메모와 확인된 메모로 분리
              const teamGroups: { [key: string]: { unchecked: WorkOrder[], checked: WorkOrder[] } } = {}
              completedResponseNotes.forEach(workOrder => {
                const team = workOrder.operationTeam
                if (!teamGroups[team]) teamGroups[team] = { unchecked: [], checked: [] }
                
                if (workOrder.responseNote?.adminChecked) {
                  teamGroups[team].checked.push(workOrder)
                } else {
                  teamGroups[team].unchecked.push(workOrder)
                }
              })

              return Object.entries(teamGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(0, 5) // 최대 5개 팀만 표시
                .map(([team, { unchecked, checked }]) => {
                  const isCollapsed = collapsedTeams.has(team)
                  const totalCount = unchecked.length + checked.length
                  
                  return (
                    <div key={team} className="border rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                              {team}
                            </span>
                            <span className="text-sm text-gray-600">
                              총 {totalCount}건
                            </span>
                            {unchecked.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                미확인 {unchecked.length}
                              </span>
                            )}
                            {checked.length > 0 && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                확인완료 {checked.length}
                              </span>
                            )}
                          </div>
                          
                          {checked.length > 0 && (
                            <button
                              onClick={() => toggleResponseTeamCollapse(team)}
                              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                              title={isCollapsed ? '확인완료 메모 보기' : '확인완료 메모 숨기기'}
                            >
                              {isCollapsed ? (
                                <>
                                  <Eye className="w-4 h-4" />
                                  <span>확인완료 보기</span>
                                </>
                              ) : (
                                <>
                                  <Minus className="w-4 h-4" />
                                  <span>확인완료 숨기기</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        {/* 미확인 메모들 */}
                        {unchecked.length > 0 && (
                          <div className="space-y-3 mb-4">
                            <h4 className="text-sm font-medium text-gray-700">📋 확인 대기중</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {unchecked.slice(0, 4).map((workOrder) => {
                                const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측'
                                const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                                
                                return (
                                  <div key={workOrder.id} className="border border-yellow-200 bg-yellow-50 rounded p-3 hover:bg-yellow-100 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          workType === 'DU측' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                        }`}>
                                          {workType}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {workOrder.completedAt ? new Date(workOrder.completedAt).toLocaleDateString() : '-'}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleMarkAsChecked(workOrder.id)}
                                        className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-200 rounded hover:bg-green-50"
                                        title="확인 완료 표시"
                                      >
                                        <Check className="w-3 h-3" />
                                        <span>확인</span>
                                      </button>
                                    </div>
                                    
                                    <div className="space-y-1 mb-3">
                                      <div className="text-sm font-medium text-gray-900 truncate">
                                        {workOrder.equipmentName}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        관리번호: {baseManagementNumber}
                                      </div>
                                    </div>
                                    
                                    <button
                                      onClick={() => setViewingResponseNote(workOrder)}
                                      className="w-full flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800 text-xs py-1.5 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>회신보기</span>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* 확인완료 메모들 */}
                        {checked.length > 0 && !isCollapsed && (
                          <div className="space-y-3 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-500">✅ 확인 완료</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {checked.slice(0, 4).map((workOrder) => {
                                const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 'RU측'
                                const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                                
                                return (
                                  <div key={workOrder.id} className="border border-gray-200 bg-gray-50 rounded p-3 opacity-75">
                                    <div className="flex items-center space-x-2 mb-2">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        workType === 'DU측' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                                      }`}>
                                        {workType}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {workOrder.responseNote?.adminCheckedAt ? 
                                          `확인: ${new Date(workOrder.responseNote.adminCheckedAt).toLocaleDateString()}` : 
                                          '확인완료'
                                        }
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-1 mb-3">
                                      <div className="text-sm font-medium text-gray-700 truncate">
                                        {workOrder.equipmentName}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        관리번호: {baseManagementNumber}
                                      </div>
                                    </div>
                                    
                                    <button
                                      onClick={() => setViewingResponseNote(workOrder)}
                                      className="w-full flex items-center justify-center space-x-1 text-gray-500 hover:text-gray-700 text-xs py-1.5 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      <span>회신보기</span>
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
            })()}
            
            {Object.keys(completedResponseNotes.reduce((acc: { [key: string]: WorkOrder[] }, wo) => {
              const team = wo.operationTeam
              if (!acc[team]) acc[team] = []
              acc[team].push(wo)
              return acc
            }, {})).length > 5 && (
              <div className="text-center py-3 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  더 많은 팀의 회신 메모가 있습니다. 작업게시판에서 전체 목록을 확인하세요.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">완료된 회신 메모가 없습니다</p>
            <p className="text-sm text-gray-400 mt-1">작업 완료 후 회신 메모가 작성되면 여기에 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 회신 메모 보기 모달 */}
      {viewingResponseNote && (
        <ResponseNoteViewModal
          workOrder={viewingResponseNote}
          onClose={() => setViewingResponseNote(null)}
        />
      )}
    </div>
  )
}