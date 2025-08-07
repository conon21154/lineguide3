import { useState, useEffect } from 'react'
import { Printer, Search, BarChart3, Upload, Bluetooth, Smartphone } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WorkOrder, DuMappingData, LabelPrintData } from '@/types'
import { parseDuMappingCSV, createLabelPrintData, formatFirstLine, formatSecondLine } from '@/utils/duMapping'
import { 
  createPrintableHTML, 
  openBrotherApp, 
  LabelContent 
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
      width: 134,
      height: 4,
      fontSize: 8,
      fontWeight: 'normal'
    }
  }
}

const LabelPreview = ({ 
  labelData,
  mux5GInfo,
  selectedWorkOrder,
  duMappingData
}: { 
  labelData: LabelPrintData | null
  mux5GInfo: string
  selectedWorkOrder: WorkOrder | null
  duMappingData: DuMappingData[]
}) => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  
  // 윈도우 리사이즈 이벤트 핸들러
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // 반응형 스케일 계산 (모바일에서는 작게, 데스크톱에서는 크게)
  const isMobile = windowWidth < 768
  const maxWidth = isMobile ? windowWidth - 80 : 414 // 모바일에서는 좌우 여백 40px씩 고려
  const scale = Math.min(3, maxWidth / LABEL_TEMPLATE.width) // 최대 3배, 화면에 맞게 조정
  
  // 미리보기용 데이터 생성 - CSV 데이터가 없어도 작업지시 정보로 표시
  let previewData = labelData
  if (!previewData && selectedWorkOrder) {
    const equipmentId = selectedWorkOrder.representativeRuId || selectedWorkOrder.duId || ''
    const formattedDuName = `${selectedWorkOrder.duName}-${selectedWorkOrder.channelCard}-${selectedWorkOrder.port}`
    
    previewData = {
      equipmentId: equipmentId.toUpperCase(),
      duName: formattedDuName,
      channelCard: selectedWorkOrder.channelCard,
      port: selectedWorkOrder.port,
      bay: duMappingData.length > 0 ? '매핑필요' : 'B0XXX',
      fdf: duMappingData.length > 0 ? '매핑필요' : 'FDF-X',
      equipmentName: selectedWorkOrder.equipmentName,
      mux5GInfo
    }
  }
  
  const firstLineText = previewData ? formatFirstLine(previewData) : '장비ID (DU명-채널카드-포트)'
  const bayFdfText = previewData ? `${previewData.bay} ${previewData.fdf}` : 'BAY FDF'
  const secondLineText = previewData ? formatSecondLine({...previewData, mux5GInfo}) : '장비명 + 5G MUX 정보'
  
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
          
          {/* 2열: 장비명 + 5G MUX */}
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
        </div>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {LABEL_TEMPLATE.width}mm × {LABEL_TEMPLATE.height}mm
        {isMobile && <span className="block text-gray-400">모바일 최적화 크기</span>}
      </div>
    </div>
  )
}

export default function LabelPrinter() {
  const { workOrders } = useWorkOrders()
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [printQuantity, setPrintQuantity] = useState(1)
  const [mux5GInfo, setMux5GInfo] = useState('')
  const [duMappingData, setDuMappingData] = useState<DuMappingData[]>([])
  const [labelData, setLabelData] = useState<LabelPrintData | null>(null)
  const [bluetoothConnected, setBluetoothConnected] = useState(false)
  const [connectedDevice, setConnectedDevice] = useState<any>(null)
  
  // CSV 데이터 로드
  useEffect(() => {
    loadDuMappingData()
  }, [])
  
  // 선택된 작업지시 변경 시 라벨 데이터 업데이트
  useEffect(() => {
    if (selectedWorkOrder && duMappingData.length > 0) {
      const newLabelData = createLabelPrintData(selectedWorkOrder, duMappingData, mux5GInfo)
      setLabelData(newLabelData)
    } else {
      setLabelData(null)
    }
  }, [selectedWorkOrder, duMappingData, mux5GInfo])
  
  const loadDuMappingData = async () => {
    // DU 매핑 데이터는 사용자가 직접 업로드하는 것으로 변경
    // 기본 파일 로드 시도 제거하여 404 오류 방지
    console.log('ℹ️ DU 매핑 데이터를 업로드해주세요.')
  }
  
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      const reader = new FileReader()
      reader.onload = (e) => {
        const csvContent = e.target?.result as string
        console.log('📁 CSV 내용:', csvContent)
        const mappingData = parseDuMappingCSV(csvContent)
        console.log('📊 파싱된 매핑 데이터:', mappingData)
        setDuMappingData(mappingData)
        alert(`DU 매핑 데이터 ${mappingData.length}개 로드 완료`)
      }
      reader.readAsText(file)
    } else {
      alert('CSV 파일만 업로드 가능합니다.')
    }
  }
  
  const connectBluetooth = async () => {
    try {
      if ('bluetooth' in navigator) {
        // Brother PT-P300BT 연결 시도
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [
            { namePrefix: 'PT-P300BT' },
            { namePrefix: 'P300BT' },
            { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Brother 프린터 서비스
            { services: ['0000180f-0000-1000-8000-00805f9b34fb'] }  // 배터리 서비스
          ],
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            '0000180f-0000-1000-8000-00805f9b34fb'
          ]
        })
        
        console.log('📱 연결된 기기:', device.name, device.id)
        
        // GATT 서버 연결
        await device.gatt!.connect()
        console.log('🔗 GATT 서버 연결 성공')
        
        setConnectedDevice(device)
        setBluetoothConnected(true)
        
        // 연결 해제 이벤트 리스너
        device.addEventListener('gattserverdisconnected', () => {
          setBluetoothConnected(false)
          setConnectedDevice(null)
          alert('📱 PT-P300BT 연결이 끊어졌습니다.')
        })
        
        alert(`✅ PT-P300BT 연결 성공!\n\n기기명: ${device.name || 'PT-P300BT'}\n\n이제 라벨을 출력할 수 있습니다.`)
      } else {
        alert('❌ 이 브라우저는 블루투스를 지원하지 않습니다.\n\nChrome, Edge 등의 최신 브라우저를 사용해주세요.')
      }
    } catch (error: any) {
      console.error('블루투스 연결 실패:', error)
      
      let errorMessage = '블루투스 연결에 실패했습니다.'
      if (error.message.includes('User cancelled')) {
        errorMessage = '사용자가 연결을 취소했습니다.'
      } else if (error.message.includes('No device selected')) {
        errorMessage = '기기를 선택하지 않았습니다.\n\n"P300BT****" 형태의 기기를 선택해주세요.'
      } else if (error.message.includes('Not found')) {
        errorMessage = 'PT-P300BT를 찾을 수 없습니다.\n\n프린터의 전원을 켜고 블루투스가 활성화되어 있는지 확인해주세요.'
      }
      
      alert(`❌ ${errorMessage}`)
    }
  }

  const disconnectBluetooth = () => {
    if (connectedDevice && connectedDevice.gatt?.connected) {
      connectedDevice.gatt.disconnect()
    }
    setBluetoothConnected(false)
    setConnectedDevice(null)
  }

  // Brother 앱 우선 출력 핸들러
  const handlePrintWithBrotherApp = () => {
    if (!labelData) {
      alert('라벨 데이터가 준비되지 않았습니다.')
      return
    }

    const firstLine = formatFirstLine(labelData)
    const secondLine = formatSecondLine({...labelData, mux5GInfo})
    const labelContent: LabelContent = {
      firstLine,
      bayFdf: `${labelData.bay} ${labelData.fdf}`,
      secondLine
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
    const secondLine = formatSecondLine({...labelData, mux5GInfo})
    const labelContent: LabelContent = {
      firstLine,
      bayFdf: `${labelData.bay} ${labelData.fdf}`,
      secondLine
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">라벨 프린터 (PT-P300BT)</h1>
        <p className="mt-2 text-gray-600">
          Brother PT-P300BT와 연결하여 현장에서 바로 장비 라벨을 출력할 수 있습니다 (12mm TZe 테이프)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 작업지시 선택 */}
        <div className="space-y-4">
          {/* PT-P300BT 연결 및 설정 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
              <Printer className="w-5 h-5" />
              <span>PT-P300BT 연결</span>
            </h2>
            <div className="space-y-4">
              {/* 권장 연결 방식 안내 */}
              <div className="bg-orange-50 border-2 border-orange-200 p-3 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Smartphone className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-orange-800 mb-1">📱 권장: Brother 앱 사용</h3>
                    <p className="text-xs text-orange-700 mb-2">
                      Brother P-touch Design&Print 2 앱이 가장 안정적이고 정확한 출력을 보장합니다
                    </p>
                    <button
                      onClick={() => openBrotherApp({
                        firstLine: labelData ? formatFirstLine(labelData) : '테스트용',
                        bayFdf: labelData ? `${labelData.bay} ${labelData.fdf}` : 'B001 FDF-1',
                        secondLine: labelData ? formatSecondLine({...labelData, mux5GInfo}) : '앱 연결 테스트'
                      })}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded-md font-medium transition-colors"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>Brother 앱으로 출력</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 블루투스 직접 연결 (보조 수단) */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">직접 블루투스 연결 (보조 수단)</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">실험적 기능</span>
                </div>
                
                {/* 프린터 상태 */}
                <div className={`p-3 rounded-lg border-2 mb-3 ${
                  bluetoothConnected 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        bluetoothConnected ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <span className="text-sm font-medium">
                        {bluetoothConnected 
                          ? `연결됨: ${connectedDevice?.name || 'PT-P300BT'}` 
                          : '브라우저 직접 연결 안됨'
                        }
                      </span>
                    </div>
                    {bluetoothConnected && (
                      <button
                        onClick={disconnectBluetooth}
                        className="text-xs text-red-600 hover:text-red-800 px-2 py-1 hover:bg-red-50 rounded"
                      >
                        연결 해제
                      </button>
                    )}
                  </div>
                </div>

                {/* 연결 버튼 */}
                <div className="flex space-x-2">
                  <button
                    onClick={connectBluetooth}
                    disabled={bluetoothConnected}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors flex-1 justify-center ${
                      bluetoothConnected 
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                    }`}
                  >
                    <Bluetooth className="w-4 h-4" />
                    <span className="text-sm">블루투스 연결 시도</span>
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2">
                  ⚠️ 브라우저 직접 연결은 불안정할 수 있습니다. Brother 앱 사용을 권장합니다.
                </p>
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
            </div>
          </div>

          {/* DU 매핑 데이터 업로드 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">DU 매핑 데이터</h2>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">CSV 파일 업로드</span>
                </label>
                <span className="text-sm text-gray-500">
                  {duMappingData.length > 0 ? `${duMappingData.length}개 로드됨` : '데이터 없음'}
                </span>
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
                  const workType = workOrder.managementNumber.includes('_DU측') ? 'DU측' : 
                                  workOrder.managementNumber.includes('_RU측') ? 'RU측' : ''
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
              duMappingData={duMappingData}
            />
          </div>

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
                  disabled={!labelData || duMappingData.length === 0}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium ${
                    labelData && duMappingData.length > 0
                      ? 'bg-orange-600 hover:bg-orange-700 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Brother 앱으로 출력 (권장)</span>
                </button>

                {/* 보조 출력 버튼: 브라우저 출력 */}
                <button
                  onClick={handleBrowserPrint}
                  disabled={!labelData || duMappingData.length === 0}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium border ${
                    labelData && duMappingData.length > 0
                      ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  <span>브라우저 출력 (보조)</span>
                </button>
              </div>
              
              {(!labelData || duMappingData.length === 0) && (
                <div className="text-xs text-red-500 mt-2">
                  {duMappingData.length === 0 && 'DU 매핑 데이터를 먼저 업로드해주세요.'}
                  {duMappingData.length > 0 && !labelData && '작업지시를 선택하거나 매핑되지 않는 DU명입니다.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}