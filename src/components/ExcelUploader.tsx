import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { parseExcelFile, convertToWorkOrderFormat } from '@/utils/excelParser'
import { parseCSVFile, convertCSVToWorkOrderFormat } from '@/utils/csvParser'
import { useWorkOrders as useWorkOrdersAPI } from '@/hooks/useWorkOrdersAPI'
import { ExcelParseResult } from '@/types'

interface ExcelUploaderProps {
  onUploadComplete?: (result: ExcelParseResult) => void
  compact?: boolean
}

export default function ExcelUploader({ onUploadComplete, compact = false }: ExcelUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null)
  const { uploadCSV, addWorkOrders } = useWorkOrdersAPI()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    const isExcel = file.name.match(/\.(xlsx|xls)$/i)
    const isCSV = file.name.match(/\.csv$/i)
    
    if (!isExcel && !isCSV) {
      setParseResult({
        success: false,
        data: [],
        errors: ['Excel 파일(.xlsx, .xls) 또는 CSV 파일(.csv)만 업로드 가능합니다.']
      })
      return
    }

    setUploading(true)
    setParseResult(null)

    try {
      let result: ExcelParseResult
      
      if (isCSV) {
        console.log('📄 CSV 파일을 백엔드로 직접 업로드')
        // CSV 파일은 백엔드로 바로 업로드 (인코딩 문제 해결)
        const uploadResult = await uploadCSV(file)
        if (uploadResult.success) {
          // 백엔드 응답에서 개수 정보 추출
          const count = uploadResult.data?.summary?.created || 0
          result = {
            success: true,
            data: new Array(count).fill({ 관리번호: '', 작업요청일: '', 작업구분: '', DU측_운용팀: '', RU측_운용팀: '', DU_ID: '', '5G_집중국명': '', 회선번호: '', 선번장: '' }), // 개수만큼 더미 데이터 생성
            errors: [],
            isUploaded: true // 이미 업로드 완료됨을 표시
          }
          console.log('✅ CSV 백엔드 업로드 완료:', uploadResult.data)
          
          // 1초 후 작업게시판으로 이동
          setTimeout(() => {
            navigate('/workboard')
          }, 1000)
          
        } else {
          result = {
            success: false,
            data: [],
            errors: [uploadResult.error || 'CSV 업로드 실패']
          }
        }
      } else {
        console.log('Excel 파일 파싱 시작')
        result = await parseExcelFile(file)
      }
      
      setParseResult(result)
      onUploadComplete?.(result)
    } catch (error) {
      setParseResult({
        success: false,
        data: [],
        errors: [`파일 처리 중 오류가 발생했습니다: ${error}`]
      })
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmUpload = async () => {
    // CSV 파일인 경우 이미 업로드 완료
    if (parseResult?.isUploaded) {
      return
    }
    
    if (!parseResult?.success || !parseResult.data.length) {
      return
    }

    try {
      // Excel 파일만 여기서 처리 (CSV는 이미 백엔드로 업로드됨)
      const convertedData = convertToWorkOrderFormat(parseResult.data)
      const result = await addWorkOrders(convertedData)
      
      if (result.success) {
        // 성공 상태로 변경하되 데이터는 유지하여 사용자가 확인할 수 있도록 함
        setParseResult({
          ...parseResult,
          success: true,
          isUploaded: true // 업로드 완료 플래그 추가
        })
        
        // 업로드 완료 콜백 호출
        onUploadComplete?.(parseResult)
        
        // 1초 후 작업 게시판으로 자동 이동
        setTimeout(() => {
          navigate('/workboard')
        }, 1000)
      }
    } catch (error) {
      console.error('💥 업로드 과정에서 오류 발생:', error)
    }
  }

  const clearResult = () => {
    setParseResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (parseResult) {
    return (
      <div className={`space-y-4 ${compact ? 'space-y-2' : ''}`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-medium text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>
            Excel 파일 분석 결과
          </h3>
          <button
            onClick={clearResult}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        </div>

        {parseResult.success ? (
          <div className="space-y-4">
            <div className={`flex items-center p-4 border rounded-lg ${
              parseResult.isUploaded 
                ? 'bg-primary-50 border-primary-200' 
                : 'bg-success-50 border-success-200'
            }`}>
              <CheckCircle className={`w-5 h-5 mr-3 ${
                parseResult.isUploaded 
                  ? 'text-primary-600' 
                  : 'text-success-600'
              }`} />
              <div>
                <p className={`font-medium ${
                  parseResult.isUploaded 
                    ? 'text-primary-800' 
                    : 'text-success-800'
                }`}>
                  {parseResult.isUploaded 
                    ? `${parseResult.data.length}개의 작업지시가 성공적으로 등록되었습니다! 1초 후 작업 게시판으로 이동합니다.`
                    : `${parseResult.data.length}개의 작업지시가 성공적으로 파싱되었습니다`
                  }
                </p>
                {parseResult.isUploaded && (
                  <p className="text-primary-700 text-sm mt-1">
                    작업게시판에서 작업을 확인하고 관리하세요.
                  </p>
                )}
              </div>
            </div>

            {parseResult.data.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">
                    파싱된 작업지시 미리보기 (최대 5개)
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          관리번호
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          작업요청일
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          작업구분
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          담당팀
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          DU ID
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          5G 집중국명
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          회선번호
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          선번장
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {parseResult.data.slice(0, 5).map((order, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-xs text-gray-900 font-mono">
                            {order.관리번호}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {order.작업요청일}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.작업구분 === 'DU측' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {order.작업구분}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {order.작업구분 === 'DU측' ? order.DU측_운용팀 : order.RU측_운용팀}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {order.DU_ID}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {order["5G_집중국명"]}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 font-mono whitespace-nowrap tabular-nums">
                            {order.회선번호}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {order.선번장 && order.선번장.length > 30 ? 
                              `${order.선번장.substring(0, 30)}...` : 
                              order.선번장
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {parseResult.isUploaded && (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">
                    📄 추출된 JSON 데이터 (14개 필드)
                  </h4>
                  <div className="bg-white rounded border p-4 max-h-96 overflow-y-auto">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                      {JSON.stringify(parseResult.data, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    <p>• 총 {parseResult.data.length}개 개통 작업 데이터 추출</p>
                    <p>• 14개 필수 필드: 관리번호, 작업요청일, DU측_운용팀, 대표_RU_ID, 대표_RU_명, 5G_Co_Site_수량, 5G_집중국명, 선번장, 종류, 서비스_구분, DU_ID, DU_명, 채널카드, 포트_A</p>
                    <p>• 빈 값은 "N/A"로 처리됨</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              {parseResult.isUploaded ? (
                <>
                  <button
                    onClick={clearResult}
                    className="btn btn-secondary"
                  >
                    새 파일 업로드
                  </button>
                  <button
                    onClick={() => navigate('/workboard')}
                    className="btn btn-primary"
                  >
                    작업게시판으로 이동
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={clearResult}
                    className="btn btn-secondary"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirmUpload}
                    disabled={uploading}
                    className="btn btn-primary"
                  >
                    {uploading ? '처리 중...' : 'JSON 데이터 확인'}
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start p-4 bg-danger-50 border border-danger-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-danger-600 mr-3 mt-0.5" />
              <div>
                <p className="text-danger-800 font-medium mb-2">
                  Excel 파일 파싱에 실패했습니다
                </p>
                <ul className="text-sm text-danger-700 space-y-1">
                  {parseResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button
              onClick={clearResult}
              className="btn btn-secondary"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${compact ? 'space-y-2' : ''}`}>
      <div
        className={`relative border-2 border-dashed rounded-lg text-center transition-colors ${
          compact ? 'p-4' : 'p-8'
        } ${
          dragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className={`space-y-4 ${compact ? 'space-y-2' : ''}`}>
          <div className={`mx-auto text-gray-400 ${compact ? 'h-8 w-8' : 'h-12 w-12'}`}>
            {uploading ? (
              <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${compact ? 'h-8 w-8' : 'h-12 w-12'}`}></div>
            ) : (
              <Upload className={compact ? 'h-8 w-8' : 'h-12 w-12'} />
            )}
          </div>
          
          <div>
            <p className={`text-gray-600 ${compact ? 'text-sm' : 'text-lg'}`}>
              {uploading 
                ? '파일을 분석하고 있습니다...'
                : compact
                ? '파일을 드래그하거나 클릭하세요'
                : 'Excel 또는 CSV 파일을 여기로 드래그하거나 클릭하여 선택하세요'
              }
            </p>
            {!compact && (
              <p className="text-sm text-gray-500 mt-1">
                .xlsx, .xls, .csv 파일을 지원합니다
              </p>
            )}
          </div>
          
          {!uploading && !compact && (
            <button className="btn btn-primary">
              파일 선택
            </button>
          )}
        </div>
      </div>

    </div>
  )
}