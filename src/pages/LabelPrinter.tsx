import { useState, useEffect } from 'react'
import { Printer, Search, BarChart3, Upload, Bluetooth } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WorkOrder, DuMappingData, LabelPrintData } from '@/types'
import { parseDuMappingCSV, createLabelPrintData, formatFirstLine, formatSecondLine } from '@/utils/duMapping'

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
  const scale = 3 // mm to px conversion for preview
  
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
      <div 
        className="bg-white border border-gray-400 relative mx-auto"
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
      <div className="text-xs text-gray-500 mt-2 text-center">
        {LABEL_TEMPLATE.width}mm × {LABEL_TEMPLATE.height}mm
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
    try {
      // CSV 데이터 로드 (대체 이벤트 리스너를 위한 fetch)
      const response = await fetch('/양식.csv')
      const csvContent = await response.text()
      const mappingData = parseDuMappingCSV(csvContent)
      setDuMappingData(mappingData)
    } catch (error) {
      console.error('DU 매핑 데이터 로드 실패:', error)
      // 페이지에서 직접 CSV 로드할 수 있도록 할 예정
    }
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
        const device = await (navigator as any).bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }] // 대표적인 라벨 프린터 서비스 UUID
        })
        setBluetoothConnected(true)
        alert(`블루투스 연결 성공: ${device.name}`)
      } else {
        alert('블루투스가 지원되지 않는 브라우저입니다.')
      }
    } catch (error) {
      console.error('블루투스 연결 실패:', error)
      alert('블루투스 연결에 실패했습니다.')
    }
  }

  const handlePrint = () => {
    if (!labelData) {
      alert('라벨 데이터가 준비되지 않았습니다.')
      return
    }

    // 모바일 블루투스 프린터를 위한 HTML 출력
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const firstLine = formatFirstLine(labelData)
      const secondLine = formatSecondLine({...labelData, mux5GInfo})
      
      printWindow.document.write(`
        <html>
          <head>
            <title>라벨 출력 - ${labelData.equipmentId}</title>
            <style>
              @page { 
                size: ${LABEL_TEMPLATE.width}mm ${LABEL_TEMPLATE.height}mm;
                margin: 0;
              }
              body { 
                margin: 0; 
                font-family: Arial, sans-serif;
              }
              .label {
                width: ${LABEL_TEMPLATE.width}mm;
                height: ${LABEL_TEMPLATE.height}mm;
                position: relative;
                page-break-after: always;
              }
              .first-line {
                position: absolute;
                left: ${LABEL_TEMPLATE.fields.firstLine.x}mm;
                top: ${LABEL_TEMPLATE.fields.firstLine.y}mm;
                width: ${LABEL_TEMPLATE.fields.firstLine.width}mm;
                height: ${LABEL_TEMPLATE.fields.firstLine.height}mm;
                font-size: ${LABEL_TEMPLATE.fields.firstLine.fontSize}px;
                font-weight: ${LABEL_TEMPLATE.fields.firstLine.fontWeight};
                display: flex;
                align-items: center;
              }
              .bay-fdf {
                position: absolute;
                left: ${LABEL_TEMPLATE.fields.bayFdf.x}mm;
                top: ${LABEL_TEMPLATE.fields.bayFdf.y}mm;
                width: ${LABEL_TEMPLATE.fields.bayFdf.width}mm;
                height: ${LABEL_TEMPLATE.fields.bayFdf.height}mm;
                font-size: ${LABEL_TEMPLATE.fields.bayFdf.fontSize}px;
                font-weight: ${LABEL_TEMPLATE.fields.bayFdf.fontWeight};
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .second-line {
                position: absolute;
                left: ${LABEL_TEMPLATE.fields.secondLine.x}mm;
                top: ${LABEL_TEMPLATE.fields.secondLine.y}mm;
                width: ${LABEL_TEMPLATE.fields.secondLine.width}mm;
                height: ${LABEL_TEMPLATE.fields.secondLine.height}mm;
                font-size: ${LABEL_TEMPLATE.fields.secondLine.fontSize}px;
                font-weight: ${LABEL_TEMPLATE.fields.secondLine.fontWeight};
                display: flex;
                align-items: center;
              }
            </style>
          </head>
          <body>
            ${Array.from({ length: printQuantity }, () => `
              <div class="label">
                <div class="first-line">${firstLine}</div>
                <div class="bay-fdf">${labelData.bay} ${labelData.fdf}</div>
                <div class="second-line">${secondLine}</div>
              </div>
            `).join('')}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">라벨 프린터</h1>
        <p className="mt-2 text-gray-600">
          현장에서 바로 장비 라벨을 출력할 수 있습니다 (138mm × 12mm)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 작업지시 선택 */}
        <div className="space-y-4">
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
              
              <button
                onClick={connectBluetooth}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                  bluetoothConnected 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span className="text-sm">
                  {bluetoothConnected ? '블루투스 연결됨' : '블루투스 연결'}
                </span>
              </button>
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

              <button
                onClick={handlePrint}
                disabled={!labelData || duMappingData.length === 0}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium ${
                  labelData && duMappingData.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>라벨 출력</span>
              </button>
              
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