import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, AlertCircle, X } from 'lucide-react'
import { parseExcelFile, convertToWorkOrderFormat } from '@/utils/excelParser'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { ExcelParseResult } from '@/types'

interface ExcelUploaderProps {
  onUploadComplete?: (result: ExcelParseResult) => void
}

export default function ExcelUploader({ onUploadComplete }: ExcelUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null)
  const { addWorkOrders, loading } = useWorkOrders()
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
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseResult({
        success: false,
        data: [],
        errors: ['Excel 파일(.xlsx, .xls)만 업로드 가능합니다.']
      })
      return
    }

    setUploading(true)
    setParseResult(null)

    try {
      const result = await parseExcelFile(file)
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
    
    if (!parseResult?.success || !parseResult.data.length) {
      return
    }

    try {
      const convertedData = convertToWorkOrderFormat(parseResult.data);
      
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
        
        // 3초 후 작업 게시판으로 자동 이동
        setTimeout(() => {
          navigate('/workboard')
        }, 3000)
      } else {
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Excel 파일 분석 결과
          </h3>
          <button
            onClick={clearResult}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
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
                    ? `${parseResult.data.length}개의 작업지시가 성공적으로 등록되었습니다! 3초 후 작업 게시판으로 이동합니다.`
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
                          <td className="px-3 py-2 text-sm text-gray-900 font-mono">
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
                    onClick={() => window.location.href = '/workboard'}
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
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    {loading ? '처리 중...' : 'JSON 데이터 확인'}
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
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
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
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <div className="space-y-4">
          <div className="mx-auto h-12 w-12 text-gray-400">
            {uploading ? (
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            ) : (
              <Upload className="h-12 w-12" />
            )}
          </div>
          
          <div>
            <p className="text-lg text-gray-600">
              {uploading 
                ? 'Excel 파일을 분석하고 있습니다...'
                : 'Excel 파일을 여기로 드래그하거나 클릭하여 선택하세요'
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              .xlsx, .xls 파일만 지원됩니다
            </p>
          </div>
          
          {!uploading && (
            <button className="btn btn-primary">
              파일 선택
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          📋 Excel 파일 요구사항
        </h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• <strong>헤더 구조:</strong> 2~3행에 병합된 헤더 (대분류/소분류)</li>
          <li>• <strong>데이터 시작:</strong> 4행부터 개통 작업 데이터</li>
          <li>• <strong>필수 필드 (14개):</strong> 관리번호, 작업요청일, DU측_운용팀, 대표_RU_ID, 대표_RU_명, 5G_Co_Site_수량, 5G_집중국명, 선번장, 종류, 서비스_구분, DU_ID, DU_명, 채널카드, 포트_A</li>
          <li>• <strong>컬럼 순서:</strong> 헤더 텍스트 기반 자동 매핑 (순서 무관)</li>
          <li>• <strong>운용팀 형식:</strong> 지역명 (울산T, 동부산T, 중부산T, 서부산T, 김해T, 창원T, 진주T, 통영T, 지하철T)</li>
          <li>• <strong>빈 값 처리:</strong> 자동으로 "N/A"로 변환</li>
        </ul>
      </div>
    </div>
  )
}