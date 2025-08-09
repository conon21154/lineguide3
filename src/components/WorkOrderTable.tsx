import { useState, useEffect } from 'react'
import { Clock, User, CheckCircle, Edit3, Trash2, Eye, X, MessageSquare, Copy } from 'lucide-react'
import clsx from 'clsx'
import { WorkOrder, WorkOrderStatus, ResponseNote } from '@/types'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'

interface WorkOrderTableProps {
  workOrders: WorkOrder[]
}

// 여러 줄을 한 줄로 압축 (요구 포맷: 항목 간 두 칸 공백 유지)
const toOneLine = (s: string) =>
  s.replace(/\s*\n+\s*/g, ' ').replace(/\s{3,}/g, '  ').trim()

// 관리번호 접미사 _(DU측|RU측) 제거
const getBaseManagementNumber = (managementNumber?: string) =>
  (managementNumber || '').replace(/_(DU측|RU측)$/g, '')

// 대표 RU명 선택: /( ^|[_\s-])(A|32T_A|_A)\b/i 우선, 없으면 첫 RU
const getRepresentativeRuName = (ruInfoList?: { ruName?: string }[]) => {
  if (!ruInfoList || ruInfoList.length === 0) return ''
  const priority = ruInfoList.find(
    ru => ru.ruName && /(^|[_\s-])(A|32T_A|_A)\b/i.test(ru.ruName)
  )
  return (priority?.ruName || ruInfoList[0]?.ruName || '').trim()
}

// 팀 비교 유틸 (공백/제로폭 제거 후 비교)
const normTeam = (t?: string) => (t || '').replace(/\s+/g, '').replace(/\u200B/g, '').trim()
const isSameTeam = (a?: string, b?: string) => normTeam(a) === normTeam(b)

const StatusBadge = ({ status }: { status: WorkOrderStatus }) => {
  const statusConfig = {
    pending: {
      label: '대기',
      icon: Clock,
      className: 'bg-warning-100 text-warning-800'
    },
    in_progress: {
      label: '진행중',
      icon: User,
      className: 'bg-primary-100 text-primary-800'
    },
    completed: {
      label: '완료',
      icon: CheckCircle,
      className: 'bg-success-100 text-success-800'
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

const ResponseNoteModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  // 회신 메모는 서버 API를 통해 저장 (현장회신 동시 기록 포함)
  const { updateResponseNote } = useWorkOrdersAPI()
  const [formData, setFormData] = useState({
    // DU측 회신 메모 필드
    concentratorName: workOrder.responseNote?.concentratorName || '',
    coSiteCount5G: workOrder.responseNote?.coSiteCount5G || '',
    mux5GInstallation: workOrder.responseNote?.mux5GInstallation || '',
    mux5GLineNumber: workOrder.responseNote?.mux5GLineNumber || '',
    tie5GLineNumber: workOrder.responseNote?.tie5GLineNumber || '',
    lteMux: workOrder.responseNote?.lteMux || '',
    
    // RU측 회신 메모 필드
    localStationName: workOrder.responseNote?.localStationName || '',
    duOpticalSignal: workOrder.responseNote?.duOpticalSignal || '',
    
    // 공통 필드
    specialNotes: workOrder.responseNote?.specialNotes || ''
  })
  const [summary, setSummary] = useState<string>((workOrder.responseNote as any)?.summary || '')
  const [isCopied, setIsCopied] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // 초기 렌더 시 자동 채움 (workOrder 데이터로부터)
  useEffect(() => {
    const workType = workOrder.workType || 'RU측'
    
    if (workType === 'DU측') {
      setFormData(prev => ({
        ...prev,
        concentratorName: prev.concentratorName || workOrder.concentratorName5G || '',
        coSiteCount5G: prev.coSiteCount5G || (workOrder.coSiteCount5G ? `${workOrder.coSiteCount5G}` : ''),
        mux5GInstallation: prev.mux5GInstallation || '',
        lteMux: prev.lteMux || workOrder.muxInfo?.lteMux || '',
        specialNotes: prev.specialNotes || ''
      }))
    } else {
      // RU측 자동 채움: 대표 RU명으로 기본값 설정
      const representativeRuName = getRepresentativeRuName(workOrder.ruInfoList)
      setFormData(prev => ({
        ...prev,
        localStationName: prev.localStationName || representativeRuName || workOrder.equipmentName || '',
        duOpticalSignal: prev.duOpticalSignal || '',
        specialNotes: prev.specialNotes || ''
      }))
    }
  }, [workOrder])

  // 요약문 자동 생성
  const generateSummary = () => {
    const workType = workOrder.workType || 'RU측'
    const baseMgmtNo = getBaseManagementNumber(workOrder.managementNumber)
    const operationTeam = workOrder.operationTeam || ''

    // Co-site 수량 계산
    const coSiteCount = workOrder.coSiteCount5G ||
      (Array.isArray(workOrder.ruInfoList) && workOrder.ruInfoList.length > 0
        ? `${workOrder.ruInfoList.length}식`
        : '')

    let summaryText = ''

    if (workType === 'DU측') {
      // 요구 포맷: 항목 간 두 칸 공백, 줄바꿈 없음, 키 고정
      const concentratorName = formData.concentratorName || workOrder.concentratorName5G || ''
      const duOpticalSignal = formData.duOpticalSignal || ''
      const mux5GLineNumber = formData.mux5GLineNumber || ''
      const tie5GLineNumber = formData.tie5GLineNumber || ''
      const specialNotes = formData.specialNotes || ''

      summaryText = `[`+
        `${operationTeam} DU측] ㅇ 관리번호 : ${baseMgmtNo}  `+
        `ㅇ 국사 명 : ${concentratorName}  `+
        `ㅇ RU 광신호 유/무 : ${duOpticalSignal}  `+
        `ㅇ 5G MUX : ${mux5GLineNumber}  `+
        `ㅇ 5G TIE 선번 : ${tie5GLineNumber}  `+
        `ㅇ 특이사항 : ${specialNotes}`
    } else {
      // RU측 포맷
      const localStationName = formData.localStationName || ''
      const mux5GInstallation = formData.mux5GInstallation || ''
      const mux5GLineNumber = formData.mux5GLineNumber || ''
      const tie5GLineNumber = formData.tie5GLineNumber || ''
      const lteMux = formData.lteMux || ''
      const specialNotes = formData.specialNotes || ''

      summaryText = `[`+
        `${operationTeam} RU측] ㅇ 관리번호 : ${baseMgmtNo}  `+
        `ㅇ 국사명 : ${localStationName}  `+
        `ㅇ 5G Co-site 수량 : ${coSiteCount || ''}  `+
        `ㅇ 5G MUX 설치유무 : ${mux5GInstallation}  `+
        `ㅇ 5G MUX 선번 : ${mux5GLineNumber}  `+
        `ㅇ 5G TIE 선번 : ${tie5GLineNumber}  `+
        `ㅇ LTE MUX : ${lteMux}  `+
        `ㅇ 특이사항 : ${specialNotes}`
    }

    setSummary(toOneLine(summaryText))
  }

  // 폼 데이터 변경 시 요약문 자동 업데이트
  useEffect(() => {
    generateSummary()
  }, [formData, workOrder])

  // 클립보드 복사 함수
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const responseNote: Partial<ResponseNote> = {
      // DU측 회신 메모 필드
      concentratorName: formData.concentratorName.trim() || undefined,
      coSiteCount5G: formData.coSiteCount5G.trim() || undefined,
      mux5GInstallation: formData.mux5GInstallation.trim() || undefined,
      mux5GLineNumber: formData.mux5GLineNumber.trim() || undefined,
      tie5GLineNumber: formData.tie5GLineNumber.trim() || undefined,
      lteMux: formData.lteMux.trim() || undefined,
      
      // RU측 회신 메모 필드
      localStationName: formData.localStationName.trim() || undefined,
      duOpticalSignal: formData.duOpticalSignal.trim() || undefined,
      
      // 공통 필드
      specialNotes: formData.specialNotes.trim() || undefined,
      
      // 요약문 포함
      summary: toOneLine(summary) || undefined,
      
      // 업데이트 시간
      updatedAt: new Date().toISOString()
    }

    console.log('📝 회신 메모 저장 요청:', responseNote)
    try {
      setIsSaving(true)
      const result = await updateResponseNote(workOrder.id, responseNote)
      if (result.success) {
        onClose()
      } else {
        console.error('❌ 회신 메모 저장 실패:', result.error)
        alert(`회신 메모 저장 중 오류가 발생했습니다.\n사유: ${result.error ?? '알 수 없는 오류'}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // 작업구분 사용 (새로운 workType 필드)
  const workType = workOrder.workType || 'RU측'
  const baseManagementNumber = workOrder.managementNumber

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">현장 회신 메모</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 자동 반영된 정보 */}
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
              {workOrder.coSiteCount5G && (
                <div>
                  <span className="font-medium">ㅇ 5G CO-SITE 수량 :</span> {workOrder.coSiteCount5G}
                </div>
              )}
              
              {/* 여러 RU 정보 표시 */}
              {workOrder.ruInfoList && workOrder.ruInfoList.length > 0 && (
                <div className="mt-3">
                  <span className="font-medium">ㅇ RU 장비 목록 :</span>
                  <div className="mt-2 space-y-1 pl-4">
                    {workOrder.ruInfoList.map((ru, index) => (
                      <div key={index} className="text-xs bg-white p-2 rounded border">
                        <div><strong>RU #{index + 1}:</strong> {ru.ruName}</div>
                        <div className="text-gray-600">ID: {ru.ruId}</div>
                        {(ru.channelCard !== undefined && ru.channelCard !== '') && (
                          <div className="text-gray-600">채널카드: {ru.channelCard}</div>
                        )}
                        {(ru.port !== undefined && ru.port !== '') && (
                          <div className="text-gray-600">포트: {ru.port}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 요약문 미리보기 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-lg font-medium text-blue-900">📋 자동 생성된 요약문</h4>
              <button
                type="button"
                onClick={copyToClipboard}
                className={`btn btn-sm transition-colors ${isCopied ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                title="클립보드에 복사"
              >
                <Copy className="w-4 h-4 mr-1" />
                {isCopied ? '복사됨!' : '복사'}
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-sm bg-white p-3 rounded border font-mono">
{summary}
            </pre>
            <p className="text-xs text-blue-600 mt-2">💡 아래 필드를 수정하면 요약문이 자동으로 업데이트됩니다</p>
          </div>

          {/* 사용자 입력 필드 */}
          <div className="space-y-4">
            {workType === 'DU측' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 국사명 :
                  </label>
                  <input
                    type="text"
                    value={formData.concentratorName}
                    onChange={(e) => setFormData({...formData, concentratorName: e.target.value})}
                    className="input w-full"
                    placeholder="예: 좌2동_현대아파트108동_32T_A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G Co-site 수량 :
                  </label>
                  <input
                    type="text"
                    value={formData.coSiteCount5G}
                    onChange={(e) => setFormData({...formData, coSiteCount5G: e.target.value})}
                    className="input w-full"
                    placeholder="예: 3식"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G MUX 설치유무 :
                  </label>
                  <input
                    type="text"
                    value={formData.mux5GInstallation}
                    onChange={(e) => setFormData({...formData, mux5GInstallation: e.target.value})}
                    className="input w-full"
                    placeholder="예: 유"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G MUX 선번 :
                  </label>
                  <input
                    type="text"
                    value={formData.mux5GLineNumber}
                    onChange={(e) => setFormData({...formData, mux5GLineNumber: e.target.value})}
                    className="input w-full"
                    placeholder="예: B0111-16-08"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 5G TIE 선번 :
                  </label>
                  <input
                    type="text"
                    value={formData.tie5GLineNumber}
                    onChange={(e) => setFormData({...formData, tie5GLineNumber: e.target.value})}
                    className="input w-full"
                    placeholder="예: 5G TIE03-180"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ LTE MUX :
                  </label>
                  <input
                    type="text"
                    value={formData.lteMux}
                    onChange={(e) => setFormData({...formData, lteMux: e.target.value})}
                    className="input w-full"
                    placeholder="예: B0030-01-10"
                  />
                </div>
              </>
            )}

            {workType === 'RU측' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ 국소명 :
                  </label>
                  <input
                    type="text"
                    value={formData.localStationName}
                    onChange={(e) => setFormData({...formData, localStationName: e.target.value})}
                    className="input w-full"
                    placeholder="예: 장안읍_장안IC교차로_32T_A"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ㅇ DU 광신호 유/무 :
                  </label>
                  <input
                    type="text"
                    value={formData.duOpticalSignal}
                    onChange={(e) => setFormData({...formData, duOpticalSignal: e.target.value})}
                    className="input w-full"
                    placeholder="예: 유, 무"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ㅇ 특이사항 :
              </label>
              <textarea
                value={formData.specialNotes}
                onChange={(e) => setFormData({...formData, specialNotes: e.target.value})}
                className="input w-full"
                rows={3}
                placeholder="특이사항이 있으면 입력하세요 (예: 없음)"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}`}
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const WorkOrderDetailModal = ({ workOrder, onClose }: { workOrder: WorkOrder, onClose: () => void }) => {
  // 디버깅: muxInfo 내용 확인
  console.log('🔍 WorkOrder muxInfo 디버깅:', {
    workOrderId: workOrder.id,
    managementNumber: workOrder.managementNumber,
    muxInfo: workOrder.muxInfo,
    lineNumber: workOrder.lineNumber,
    serviceType: workOrder.serviceType,
    concentratorName5G: workOrder.concentratorName5G
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">작업지시 상세정보</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
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
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">DU 정보</h3>
              <div className="space-y-3">
                <div><span className="font-medium text-gray-700">DU ID:</span> {workOrder.duId}</div>
                <div><span className="font-medium text-gray-700">DU명:</span> {workOrder.duName}</div>
                <div><span className="font-medium text-gray-700">채널카드:</span> {workOrder.channelCard}</div>
                <div><span className="font-medium text-gray-700">포트:</span> {workOrder.port}</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">선번장 정보</h3>
            <div className="space-y-3">
              <div>
                <span className="font-medium text-gray-700">회선번호:</span>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mt-1 break-all">
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
  )
}


export default function WorkOrderTable({ workOrders }: WorkOrderTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingStatus, setEditingStatus] = useState<WorkOrderStatus>('pending')
  const [notes, setNotes] = useState('')
  const [viewingDetailId, setViewingDetailId] = useState<string | null>(null)
  const [responseNoteId, setResponseNoteId] = useState<string | null>(null)

  console.log('📱 WorkOrderTable 렌더링:', {
    workOrdersCount: workOrders.length,
    isMobile: window.innerWidth < 640,
    workOrdersSample: workOrders.slice(0, 2).map(w => ({
      id: w.id,
      managementNumber: w.managementNumber,
      operationTeam: w.operationTeam
    }))
  })
  const { updateStatus, deleteWorkOrder } = useWorkOrders()

  const handleEditStart = (workOrder: WorkOrder) => {
    setEditingId(workOrder.id)
    setEditingStatus(workOrder.status)
    setNotes(workOrder.notes || '')
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditingStatus('pending')
    setNotes('')
  }

  const handleEditSave = async (id: string) => {
    // 완료로 변경하려는 경우: 회신 메모 모달 먼저 띄우고, 저장 성공 시 완료 처리
    if (editingStatus === 'completed') {
      setEditingId(null)
      setResponseNoteId(id)
      return
    }
    await updateStatus(id, editingStatus, notes)
    handleEditCancel()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('이 작업지시를 삭제하시겠습니까?')) {
      await deleteWorkOrder(id)
    }
  }

  if (workOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          작업지시가 없습니다
        </h3>
        <p className="text-gray-600 mb-2">
          Excel 파일을 업로드하여 작업지시를 등록하세요
        </p>
        <div className="text-xs text-gray-400 mt-4 p-2 bg-gray-50 rounded">
          디버깅: 모바일={window.innerWidth < 640 ? 'YES' : 'NO'}, 화면너비={window.innerWidth}px
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
      {/* 모바일: 카드 형태 */}
      <div className="block sm:hidden">
        {workOrders.map((workOrder) => (
          <div key={workOrder.id} className="border-b border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                <div className="flex items-center space-x-1">
                  <span>{workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}</span>
                  {workOrder.managementNumber.includes('_DU측') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      DU
                    </span>
                  )}
                  {workOrder.managementNumber.includes('_RU측') && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      RU
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge status={workOrder.status} />
            </div>
            
            <div className="space-y-2 text-sm">
              <div><strong>운용팀:</strong> {workOrder.operationTeam}</div>
              <div><strong>작업요청일:</strong> {workOrder.requestDate}</div>
              <div><strong>장비명:</strong> {workOrder.equipmentName}</div>
              <div><strong>5G 집중국:</strong> {workOrder.concentratorName5G}</div>
              {workOrder.coSiteCount5G && (
                <div><strong>CO-SITE 수량:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{workOrder.coSiteCount5G}</span></div>
              )}
              <div><strong>DU ID:</strong> {workOrder.duId}</div>
              <div><strong>DU 명:</strong> {workOrder.duName}</div>
            </div>
            
            <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100">
              <button
                onClick={() => setViewingDetailId(workOrder.id)}
                className="text-blue-600 hover:text-blue-900 p-1"
                title="상세보기"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => setResponseNoteId(workOrder.id)}
                className={`hover:text-green-900 p-1 ${workOrder.responseNote ? 'text-green-600' : 'text-gray-400'}`}
                title="현장 회신 메모"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEditStart(workOrder)}
                className="text-primary-600 hover:text-primary-900 p-1"
                title="상태 변경"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(workOrder.id)}
                className="text-danger-600 hover:text-danger-900 p-1"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크톱: 테이블 형태 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리번호
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업요청일
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                운용팀
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                장비 정보
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                DU 정보
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workOrders.map((workOrder) => (
              <tr key={workOrder.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded max-w-xs break-all">
                    <div className="flex items-center space-x-1">
                      <span>{workOrder.managementNumber.replace(/_DU측|_RU측/g, '')}</span>
                      {workOrder.managementNumber.includes('_DU측') && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          DU
                        </span>
                      )}
                      {workOrder.managementNumber.includes('_RU측') && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          RU
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 min-w-[120px]">
                  <div className="text-sm text-gray-900 break-all">
                    {workOrder.requestDate}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="space-x-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {workOrder.operationTeam}
                    </span>
                    {(() => {
                      const partner = (workOrder as any).partnerTeam as string | undefined
                      return partner && !isSameTeam(workOrder.operationTeam, partner) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                          파트너: {partner}
                        </span>
                      ) : null
                    })()}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    <div><strong>장비명:</strong> {workOrder.equipmentName}</div>
                    <div><strong>5G 집중국:</strong> {workOrder.concentratorName5G}</div>
                    <div><strong>구분:</strong> {workOrder.equipmentType}</div>
                    <div><strong>서비스:</strong> {workOrder.serviceType}</div>
                    {workOrder.coSiteCount5G && (
                      <div><strong>CO-SITE 수량:</strong> <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{workOrder.coSiteCount5G}</span></div>
                    )}
                    {workOrder.ruInfoList && workOrder.ruInfoList.length > 1 && (
                      <div><strong>RU 개수:</strong> <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">{workOrder.ruInfoList.length}개</span></div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-sm text-gray-900">
                  <div className="space-y-1">
                    <div><strong>DU ID:</strong> {workOrder.duId}</div>
                    <div><strong>DU 명:</strong> {workOrder.duName}</div>
                    <div><strong>채널카드:</strong> {workOrder.channelCard ?? 'N/A'}</div>
                    <div><strong>포트:</strong> {workOrder.port ?? 'N/A'}</div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {editingId === workOrder.id ? (
                    <div className="space-y-2">
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value as WorkOrderStatus)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="pending">대기</option>
                        <option value="in_progress">진행중</option>
                        <option value="completed">완료</option>
                      </select>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="메모 (선택사항)"
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                        rows={2}
                      />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEditSave(workOrder.id)}
                          className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                        >
                          저장
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="text-xs bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <StatusBadge status={workOrder.status} />
                      {workOrder.notes && (
                        <div className="text-xs text-gray-500">
                          {workOrder.notes}
                        </div>
                      )}
                      {workOrder.completedAt && (
                        <div className="text-xs text-gray-500">
                          완료: {new Date(workOrder.completedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === workOrder.id ? null : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingDetailId(workOrder.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="상세보기"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResponseNoteId(workOrder.id)}
                        className={`hover:text-green-900 ${workOrder.responseNote ? 'text-green-600' : 'text-gray-400'}`}
                        title="현장 회신 메모"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditStart(workOrder)}
                        className="text-primary-600 hover:text-primary-900"
                        title="상태 변경"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(workOrder.id)}
                        className="text-danger-600 hover:text-danger-900"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {viewingDetailId && (
        <WorkOrderDetailModal
          workOrder={workOrders.find(wo => wo.id === viewingDetailId)!}
          onClose={() => setViewingDetailId(null)}
        />
      )}

      {responseNoteId && (
        <ResponseNoteModal
          workOrder={workOrders.find(wo => wo.id === responseNoteId)!}
          onClose={() => setResponseNoteId(null)}
        />
      )}
    </div>
  )
}