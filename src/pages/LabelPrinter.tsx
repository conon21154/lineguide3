import { useState } from 'react'
import { Printer, Search, QrCode, BarChart3 } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WorkOrder } from '@/types'

interface LabelTemplate {
  id: string
  name: string
  width: number
  height: number
  fields: LabelField[]
}

interface LabelField {
  id: string
  name: string
  type: 'text' | 'barcode' | 'qrcode'
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
  fontWeight?: string
}

const labelTemplates: LabelTemplate[] = [
  {
    id: 'equipment-label',
    name: '장비 라벨',
    width: 60,  // mm
    height: 30, // mm
    fields: [
      {
        id: 'management-number',
        name: '관리번호',
        type: 'text',
        x: 2,
        y: 2,
        width: 25,
        height: 6,
        fontSize: 10,
        fontWeight: 'bold'
      },
      {
        id: 'equipment-name',
        name: '장비명',
        type: 'text',
        x: 2,
        y: 10,
        width: 35,
        height: 5,
        fontSize: 8
      },
      {
        id: 'operation-team',
        name: '운용팀',
        type: 'text',
        x: 2,
        y: 17,
        width: 20,
        height: 4,
        fontSize: 7
      },
      {
        id: 'qr-code',
        name: 'QR코드',
        type: 'qrcode',
        x: 42,
        y: 2,
        width: 16,
        height: 16
      }
    ]
  },
  {
    id: 'simple-barcode',
    name: '관리번호 바코드',
    width: 50,
    height: 20,
    fields: [
      {
        id: 'barcode',
        name: '관리번호 바코드',
        type: 'barcode',
        x: 2,
        y: 2,
        width: 46,
        height: 12
      },
      {
        id: 'management-text',
        name: '관리번호 텍스트',
        type: 'text',
        x: 2,
        y: 15,
        width: 46,
        height: 3,
        fontSize: 8
      }
    ]
  }
]

const LabelPreview = ({ 
  template, 
  workOrder 
}: { 
  template: LabelTemplate
  workOrder: WorkOrder | null 
}) => {
  const scale = 4 // mm to px conversion for preview
  
  return (
    <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
      <h3 className="text-sm font-medium text-gray-700 mb-2">라벨 미리보기</h3>
      <div 
        className="bg-white border border-gray-400 relative mx-auto"
        style={{ 
          width: `${template.width * scale}px`, 
          height: `${template.height * scale}px` 
        }}
      >
        {template.fields.map((field) => {
          let content = ''
          if (workOrder) {
            switch (field.id) {
              case 'management-number':
              case 'management-text':
              case 'barcode':
                content = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                break
              case 'equipment-name':
                content = workOrder.equipmentName
                break
              case 'operation-team':
                content = workOrder.operationTeam
                break
              case 'qr-code':
                content = workOrder.managementNumber.replace(/_DU측|_RU측/g, '')
                break
            }
          } else {
            content = field.name
          }
          
          return (
            <div
              key={field.id}
              className="absolute border border-gray-200 flex items-center justify-center text-xs"
              style={{
                left: `${field.x * scale}px`,
                top: `${field.y * scale}px`,
                width: `${field.width * scale}px`,
                height: `${field.height * scale}px`,
                fontSize: `${(field.fontSize || 8) * scale / 4}px`,
                fontWeight: field.fontWeight || 'normal'
              }}
            >
              {field.type === 'qrcode' ? (
                <QrCode className="w-full h-full p-1" />
              ) : field.type === 'barcode' ? (
                <div className="w-full h-full bg-black bg-opacity-80 text-white text-center text-xs flex items-end justify-center pb-1">
                  |||||||
                </div>
              ) : (
                <span className="truncate p-1">{content}</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        {template.width}mm × {template.height}mm
      </div>
    </div>
  )
}

export default function LabelPrinter() {
  const { workOrders } = useWorkOrders()
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate>(labelTemplates[0])
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [printQuantity, setPrintQuantity] = useState(1)
  
  // 검색 필터링된 작업지시
  const filteredWorkOrders = workOrders.filter(wo => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      wo.managementNumber.toLowerCase().includes(searchLower) ||
      wo.equipmentName.toLowerCase().includes(searchLower) ||
      wo.operationTeam.toLowerCase().includes(searchLower) ||
      wo.concentratorName5G.toLowerCase().includes(searchLower)
    )
  })

  const handlePrint = () => {
    if (!selectedWorkOrder) {
      alert('작업지시를 선택해주세요.')
      return
    }

    // 실제 프린터 출력 로직
    // 현재는 시뮬레이션으로 print() 호출
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      const baseManagementNumber = selectedWorkOrder.managementNumber.replace(/_DU측|_RU측/g, '')
      
      printWindow.document.write(`
        <html>
          <head>
            <title>라벨 출력 - ${baseManagementNumber}</title>
            <style>
              @page { 
                size: ${selectedTemplate.width}mm ${selectedTemplate.height}mm;
                margin: 0;
              }
              body { 
                margin: 0; 
                font-family: Arial, sans-serif;
              }
              .label {
                width: ${selectedTemplate.width}mm;
                height: ${selectedTemplate.height}mm;
                position: relative;
                page-break-after: always;
              }
              .field {
                position: absolute;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #ccc;
              }
            </style>
          </head>
          <body>
            ${Array.from({ length: printQuantity }, () => `
              <div class="label">
                ${selectedTemplate.fields.map(field => {
                  let content = ''
                  switch (field.id) {
                    case 'management-number':
                    case 'management-text':
                    case 'barcode':
                      content = baseManagementNumber
                      break
                    case 'equipment-name':
                      content = selectedWorkOrder.equipmentName
                      break
                    case 'operation-team':
                      content = selectedWorkOrder.operationTeam
                      break
                    case 'qr-code':
                      content = `QR: ${baseManagementNumber}`
                      break
                  }
                  
                  return `
                    <div class="field" style="
                      left: ${field.x}mm;
                      top: ${field.y}mm;
                      width: ${field.width}mm;
                      height: ${field.height}mm;
                      font-size: ${field.fontSize || 8}px;
                      font-weight: ${field.fontWeight || 'normal'};
                    ">
                      ${field.type === 'qrcode' ? `[QR: ${content}]` :
                        field.type === 'barcode' ? `[바코드: ${content}]` :
                        content}
                    </div>
                  `
                }).join('')}
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
          현장에서 바로 장비 라벨을 출력할 수 있습니다
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 왼쪽: 작업지시 선택 */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">작업지시 선택</h2>
            
            {/* 검색 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="관리번호, 장비명, 운용팀으로 검색..."
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
                          집중국: {workOrder.concentratorName5G}
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
          {/* 라벨 템플릿 선택 */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 mb-4">라벨 템플릿</h2>
            <div className="grid grid-cols-1 gap-3">
              {labelTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                      <p className="text-xs text-gray-500">{template.width}mm × {template.height}mm</p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {template.fields.length}개 필드
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 라벨 미리보기 */}
          <div className="card">
            <LabelPreview template={selectedTemplate} workOrder={selectedWorkOrder} />
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
                disabled={!selectedWorkOrder}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium ${
                  selectedWorkOrder
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>라벨 출력</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}