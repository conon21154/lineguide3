import { useState, useEffect, useMemo } from 'react'
import { Printer, Search, BarChart3, Upload, Smartphone, Copy, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import { useAuth } from '@/contexts/AuthContext'
import { WorkOrder, LabelPrintData, WorkOrderFilter, OperationTeam } from '@/types'
import { 
  createPrintableHTML, 
  openBrotherApp, 
  LabelContent,
  TZE_TAPES
} from '@/utils/brotherPrinter'

// 새로운 라벨 템플릿 (138mm x 12mm)
const LABEL_TEMPLATE = {
  width: 138,   // mm
  height: 12,   // mm
  fields: {
    firstLine: {
      x: 2,
      y: 1,
      width: 100,
      height: 5,
      fontSize: 10,
      fontWeight: 'bold'
    },
    bayFdf: {
      x: 104,
      y: 1,
      width: 32,
      height: 5,
      fontSize: 9,
      fontWeight: 'normal'
    },
    secondLine: {
      x: 2,
      y: 7,
      width: 95,  // 5G MUX 공간 확보를 위해 너비 축소
      height: 4,
      fontSize: 8,
      fontWeight: 'normal'
    },
    mux5G: {
      x: 99,      // secondLine 우측
      y: 7,
      width: 37,   // 우측 하단 영역
      height: 4,
      fontSize: 8,
      fontWeight: 'normal'
    }
  }
}

// 모바일 환경 감지
const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)

// 라벨 데이터 생성 함수 (DU 매핑 없이)
const createLabelData = (workOrder: WorkOrder, mux5GInfo: string): LabelPrintData => {
  const equipmentId = workOrder.representativeRuId || workOrder.duId || ''
  const formattedDuName = `${workOrder.duName}-${workOrder.channelCard}-${workOrder.port}`
  
  return {
    equipmentId: equipmentId.toUpperCase(),
    duName: formattedDuName,
    channelCard: workOrder.channelCard,
    port: workOrder.port,
    bay: 'BAY', // 기본값
    fdf: 'FDF', // 기본값
    equipmentName: workOrder.equipmentName,
    mux5GInfo
  }
}

// 첫 번째 줄 포맷팅 함수
const formatFirstLine = (labelData: LabelPrintData): string => {
  return `${labelData.equipmentId} ${labelData.duName}`
}

const LabelPreview = ({ 
  labelData,
  mux5GInfo,
  selectedWorkOrder
}: { 
  labelData: LabelPrintData | null
  mux5GInfo: string
  selectedWorkOrder: WorkOrder | null
}) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  
  // 윈도우 리사이즈 이벤트 핸들러
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // 반응형 스케일 계산 (모바일에서는 훨씬 더 작게)
  const isMobileView = windowWidth < 768
  const containerWidth = isMobileView ? windowWidth - 64 : 414 // 모바일: 32px씩 여백
  const maxLabelWidth = Math.min(containerWidth, isMobileView ? 280 : 414) // 모바일에서 최대 280px
  const scale = Math.max(1, Math.min(3, maxLabelWidth / LABEL_TEMPLATE.width)) // 최소 1배, 최대 3배
  
  // 미리보기용 데이터 생성
  let previewData = labelData
  if (!previewData && selectedWorkOrder) {
    previewData = createLabelData(selectedWorkOrder, mux5GInfo)
  }
  
  const firstLineText = previewData ? formatFirstLine(previewData) : '장비ID (DU명-채널카드-포트)'
  const bayFdfText = previewData ? `${previewData.bay} ${previewData.fdf}` : 'BAY FDF'
  
  // secondLine에서는 장비명만 표시 (5G MUX 제외)
  const secondLineText = previewData ? previewData.equipmentName : '장비명'
  
  // 5G MUX 정보는 별도 영역에 표시
  const mux5GText = mux5GInfo.trim() || (previewData?.mux5GInfo?.trim()) || ''
  
  return (
    <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
      <h3 className="text-sm font-medium text-gray-700 mb-2">라벨 미리보기</h3>
      <div className="overflow-x-auto">
        <div 
          className="bg-white border border-gray-400 relative mx-auto min-w-max"
          style={{ 
            width: `${LABEL_TEMPLATE.width * scale}px`, 
            height: `${LABEL_TEMPLATE.height * scale}px` 
          }}
        >
          {/* 1열: 장비ID + DU명 */}
          <div
            className="absolute border border-gray-200 flex items-center px-1 text-xs font-bold"
            style={{
              left: `${LABEL_TEMPLATE.fields.firstLine.x * scale}px`,
              top: `${LABEL_TEMPLATE.fields.firstLine.y * scale}px`,
              width: `${LABEL_TEMPLATE.fields.firstLine.width * scale}px`,
              height: `${LABEL_TEMPLATE.fields.firstLine.height * scale}px`,
              fontSize: `${LABEL_TEMPLATE.fields.firstLine.fontSize * scale / 4}px`
            }}
          >
            <span className="truncate">{firstLineText}</span>
          </div>
          
          {/* 1열 우측: BAY, FDF */}
          <div
            className="absolute border border-gray-200 flex items-center justify-center text-xs"
            style={{
              left: `${LABEL_TEMPLATE.fields.bayFdf.x * scale}px`,
              top: `${LABEL_TEMPLATE.fields.bayFdf.y * scale}px`,
              width: `${LABEL_TEMPLATE.fields.bayFdf.width * scale}px`,
              height: `${LABEL_TEMPLATE.fields.bayFdf.height * scale}px`,
              fontSize: `${LABEL_TEMPLATE.fields.bayFdf.fontSize * scale / 4}px`
            }}
          >
            <span className="truncate">{bayFdfText}</span>
          </div>
          
          {/* 2열 좌측: 장비명 */}
          <div
            className="absolute border border-gray-200 flex items-center px-1 text-xs"
            style={{
              left: `${LABEL_TEMPLATE.fields.secondLine.x * scale}px`,
              top: `${LABEL_TEMPLATE.fields.secondLine.y * scale}px`,
              width: `${LABEL_TEMPLATE.fields.secondLine.width * scale}px`,
              height: `${LABEL_TEMPLATE.fields.secondLine.height * scale}px`,
              fontSize: `${LABEL_TEMPLATE.fields.secondLine.fontSize * scale / 4}px`
            }}
          >
            <span className="truncate">{secondLineText}</span>
          </div>
          
          {/* 2열 우측: 5G MUX 정보 */}
          <div
            className="absolute border border-gray-200 flex items-center justify-center px-1 text-xs"
            style={{
              left: `${LABEL_TEMPLATE.fields.mux5G.x * scale}px`,
              top: `${LABEL_TEMPLATE.fields.mux5G.y * scale}px`,
              width: `${LABEL_TEMPLATE.fields.mux5G.width * scale}px`,
              height: `${LABEL_TEMPLATE.fields.mux5G.height * scale}px`,
              fontSize: `${LABEL_TEMPLATE.fields.mux5G.fontSize * scale / 4}px`,
              backgroundColor: mux5GText ? '#fffbeb' : '#f9fafb', // 입력 시 살짝 노란 배경
              color: mux5GText ? '#92400e' : '#6b7280'
            }}
          >
            <span className="truncate">{mux5GText || '5G MUX'}</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {LABEL_TEMPLATE.width}mm × {LABEL_TEMPLATE.height}mm
        {isMobileView && <span className="block text-gray-400">모바일 최적화 크기</span>}
      </div>
    </div>
  )
}

// 모바일 가이드 컴포넌트
const MobileGuide = () => (
  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-4 rounded-lg">
    <div className="flex items-start space-x-3">
      <Smartphone className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-blue-800 mb-2">📱 모바일 사용자 가이드</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <span>Brother P-touch Design&Print 2 앱을 설치하세요</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span>PT-P300BT와 블루투스로 연결하세요</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <span>아래 "Brother 앱으로 출력" 버튼을 클릭하세요</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
            <span>앱에서 라벨 텍스트를 붙여넣기하고 출력하세요</span>
          </div>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <a
            href={isIOS() 
              ? 'https://apps.apple.com/app/brother-p-touch-design-print-2/id1468451451'
              : 'https://play.google.com/store/apps/details?id=com.brother.ptouch.designandprint2'
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md font-medium transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span>앱 설치하기</span>
          </a>
        </div>
      </div>
    </div>
  </div>
)

// 클립보드 복사 컴포넌트
const ClipboardCopy = ({ text, onCopy }: { text: string, onCopy: () => void }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        onCopy()
        setTimeout(() => setCopied(false), 2000)
      } else {
        // 폴백: 텍스트 선택
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        setCopied(true)
        onCopy()
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      console.error('클립보드 복사 실패:', error)
      alert('클립보드 복사에 실패했습니다. 텍스트를 수동으로 복사해주세요.')
    }
  }

  return (
    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">라벨 텍스트</span>
        <button
          onClick={handleCopy}
          className={`flex items-center space-x-2 px-2 py-1 rounded text-xs font-medium transition-colors ${
            copied 
              ? 'bg-green-100 text-green-800' 
              : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
          }`}
        >
          {copied ? (
            <>
              <CheckCircle className="w-3 h-3" />
              <span>복사됨</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>복사</span>
            </>
          )}
        </button>
      </div>
      <div className="bg-white border border-gray-300 p-2 rounded text-xs font-mono whitespace-pre-wrap break-all">
        {text}
      </div>
    </div>
  )
}

export default function LabelPrinter() {
  const { user, isAdmin } = useAuth()
  
  // 현장팀 사용자는 자신의 팀 작업만 볼 수 있도록 필터 적용
  const filter: WorkOrderFilter = useMemo(() => {
    const f: WorkOrderFilter = {}
    if (!isAdmin && user?.team) {
      f.operationTeam = user.team as OperationTeam
    }
    return f
  }, [isAdmin, user?.team])
  
  const { workOrders, loading } = useWorkOrdersAPI(filter)
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [printQuantity, setPrintQuantity] = useState(1)
  const [mux5GInfo, setMux5GInfo] = useState('')
  const [labelData, setLabelData] = useState<LabelPrintData | null>(null)
  const [copiedText, setCopiedText] = useState('')
  
  // 디버깅: 작업지시 로드 상태 확인
  useEffect(() => {
    console.log('🏷️ LabelPrinter 디버깅:', {
      totalWorkOrders: workOrders.length,
      filter,
      user: user?.team,
      isAdmin,
      workOrdersSample: workOrders.slice(0, 3).map(wo => ({
        id: wo.id,
        managementNumber: wo.managementNumber,
        operationTeam: wo.operationTeam
      }))
    });
  }, [workOrders, filter, user, isAdmin])
  
  // 선택된 작업지시 변경 시 라벨 데이터 업데이트
  useEffect(() => {
    if (selectedWorkOrder) {
      const newLabelData = createLabelData(selectedWorkOrder, mux5GInfo)
      setLabelData(newLabelData)
    } else {
      setLabelData(null)
    }
  }, [selectedWorkOrder, mux5GInfo])
  
  // 검색 필터링된 작업지시
  const filteredWorkOrders = workOrders.filter(wo => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      wo.managementNumber.toLowerCase().includes(searchLower) ||
      wo.equipmentName.toLowerCase().includes(searchLower) ||
      wo.operationTeam.toLowerCase().includes(searchLower) ||
      wo.concentratorName5G.toLowerCase().includes(searchLower) ||
      wo.duName.toLowerCase().includes(searchLower) ||
      wo.duId.toLowerCase().includes(searchLower) ||
      (wo.representativeRuId && wo.representativeRuId.toLowerCase().includes(searchLower))
    )
  })

  // Brother 앱 출력 핸들러 (개선된 버전)
  const handlePrintWithBrotherApp = () => {
    if (!labelData) {
      alert('라벨 데이터가 준비되지 않았습니다.')
      return
    }

    const firstLine = formatFirstLine(labelData)
    const secondLine = labelData.equipmentName // 장비명만
    const labelContent: LabelContent = {
      firstLine,
      bayFdf: `${labelData.bay} ${labelData.fdf}`,
      secondLine,
      mux5G: mux5GInfo.trim() || undefined
    }

    // Brother 앱으로 출력 시도
    openBrotherApp(labelContent)
  }

  // 브라우저 출력 핸들러 (보조 수단)
  const handleBrowserPrint = () => {
    if (!labelData) {
      alert('라벨 데이터가 준비되지 않았습니다.')
      return
    }

    const firstLine = formatFirstLine(labelData)
    const secondLine = labelData.equipmentName // 장비명만
    const labelContent: LabelContent = {
      firstLine,
      bayFdf: `${labelData.bay} ${labelData.fdf}`,
      secondLine,
      mux5G: mux5GInfo.trim() || undefined
    }

    // 브라우저 출력 확인
    const confirmed = confirm(
      '🖨️ 브라우저로 출력하시겠습니까?\n\n' +
      '⚠️ Brother 앱을 사용하시면 더 정확한 출력이 가능합니다.\n\n' +
      '✅ 예: 브라우저 출력 계속\n' +
      '❌ 아니오: 취소'
    )
    
    if (confirmed) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const html = createPrintableHTML(labelContent, printQuantity)
        printWindow.document.write(html)
        printWindow.document.close()
      }
    }
  }

  // 라벨 텍스트 생성
  const getLabelText = () => {
    if (!labelData) return ''
    
    const firstLine = formatFirstLine(labelData)
    const secondLine = labelData.equipmentName
    const bayFdf = `${labelData.bay} ${labelData.fdf}`
    
    return mux5GInfo.trim() ? 
      `${firstLine}\n${bayFdf}\n${secondLine} | ${mux5GInfo.trim()}` :
      `${firstLine}\n${bayFdf}\n${secondLine}`
  }

  // 로딩 상태 표시
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">작업지시를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">라벨 프린터 (PT-P300BT)</h1>
        <p className="mt-2 text-gray-600">
          Brother PT-P300BT와 연결하여 현장에서 바로 장비 라벨을 출력할 수 있습니다 (12mm TZe 테이프)
        </p>
      </div>

      {/* 모바일 가이드 (모바일에서만 표시) */}
      {isMobile() && (
        <MobileGuide />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 작업지시 선택 */}
        <div className="space-y-4">
          {/* PT-P300BT 설정 및 안내 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>PT-P300BT 설정</span>
            </h2>
            <div className="space-y-4">
              {/* 권장 연결 방식 안내 */}
              <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-green-800 mb-2">📱 권장: Brother 앱 사용</h3>
                    <p className="text-xs text-green-700 mb-3">
                      Brother P-touch Design&Print 2 앱이 가장 안정적이고 정확한 출력을 보장합니다
                    </p>
                    <div className="space-y-2 text-xs text-green-700">
                      <div>✅ 블루투스 연결 자동 관리</div>
                      <div>✅ 정확한 라벨 크기 및 폰트</div>
                      <div>✅ 테이프 종류 자동 감지</div>
                      <div>✅ 배터리 상태 확인</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* TZe 테이프 정보 */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">권장 TZe 테이프</h3>
                <div className="space-y-1 text-xs text-blue-700">
                  <div>• TZe-131 (12mm, 투명바탕/검정글씨) - 권장</div>
                  <div>• TZe-231 (12mm, 흰바탕/검정글씨)</div>
                  <div>• 테이프 폭: 12mm 고정</div>
                </div>
              </div>

              {/* 프린터 연결 상태 */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <h3 className="text-sm font-medium text-gray-800 mb-2">연결 상태</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-700">Brother 앱을 통해 연결 가능</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  앱에서 PT-P300BT와 블루투스 연결 후 라벨 출력이 가능합니다
                </p>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">작업지시 선택</h2>
            
            {/* 검색 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="관리번호, 장비명, 운용팀, DU명, 장비ID로 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* 작업지시 목록 */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredWorkOrders.length > 0 ? (
                filteredWorkOrders.map((workOrder) => {
                  const workType = workOrder.workType || 'RU측'
                  const baseManagementNumber = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                  const isSelected = selectedWorkOrder?.id === workOrder.id
                  const equipmentId = workOrder.representativeRuId || workOrder.duId || ''
                  
                  return (
                    <div
                      key={workOrder.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedWorkOrder(workOrder)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {workOrder.operationTeam}
                          </span>
                          {workType && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              workType === 'DU측' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {workType}
                            </span>
                          )}
                        </div>
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
                      
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">
                          {workOrder.equipmentName}
                        </div>
                        <div className="text-xs text-gray-500">
                          관리번호: {baseManagementNumber}
                        </div>
                        <div className="text-xs text-gray-500">
                          장비ID: {equipmentId.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          DU명: {workOrder.duName}
                        </div>
                        <div className="text-xs text-gray-500">
                          채널카드: {workOrder.channelCard} | 포트: {workOrder.port}
                        </div>
                        <div className="text-xs text-gray-500">
                          집중국: {workOrder.concentratorName5G}
                        </div>
                        <div className="text-xs text-gray-500">
                          작업내용: {workOrder.workContent}
                        </div>
                        <div className="text-xs text-gray-500">
                          요청일: {workOrder.requestDate}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다' : '작업지시가 없습니다'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 라벨 설정 및 미리보기 */}
        <div className="space-y-4">
          {/* 5G MUX 정보 입력 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">5G MUX 정보</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  5G MUX 정보 (현장 입력)
                </label>
                <input
                  type="text"
                  placeholder="예: 5G-MUX-01"
                  value={mux5GInfo}
                  onChange={(e) => setMux5GInfo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 라벨 미리보기 */}
          <div className="card">
            <LabelPreview 
              labelData={labelData} 
              mux5GInfo={mux5GInfo} 
              selectedWorkOrder={selectedWorkOrder}
            />
          </div>

          {/* 라벨 텍스트 복사 */}
          {labelData && (
            <div className="card">
              <h2 className="text-lg font-medium text-gray-900 mb-4">라벨 텍스트</h2>
              <ClipboardCopy 
                text={getLabelText()} 
                onCopy={() => setCopiedText(getLabelText())}
              />
            </div>
          )}

          {/* 출력 설정 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">출력 설정</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  출력 매수
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={printQuantity}
                  onChange={(e) => setPrintQuantity(parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="ml-2 text-sm text-gray-500">매</span>
              </div>

              <div className="space-y-2">
                {/* 주 출력 버튼: Brother 앱 우선 */}
                <button
                  onClick={handlePrintWithBrotherApp}
                  disabled={!labelData}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium ${
                    labelData
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Brother 앱으로 출력 (권장)</span>
                </button>

                {/* 보조 출력 버튼: 브라우저 출력 */}
                <button
                  onClick={handleBrowserPrint}
                  disabled={!labelData}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium border ${
                    labelData
                      ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>브라우저 출력 (보조)</span>
                </button>
              </div>
              
              {!labelData && (
                <div className="text-xs text-red-500 mt-2">
                  작업지시를 선택해주세요.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}