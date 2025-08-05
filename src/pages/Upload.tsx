import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ExcelUploader from '@/components/ExcelUploader'
import { ExcelParseResult } from '@/types'

export default function Upload() {
  const [uploadResult, setUploadResult] = useState<ExcelParseResult | null>(null)
  const navigate = useNavigate()

  const handleUploadComplete = (result: ExcelParseResult) => {
    setUploadResult(result)
    // 자동 리다이렉트 제거 - 사용자가 직접 선택하도록 함
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">작업지시 업로드</h1>
        <p className="mt-2 text-gray-600">
          Excel 또는 CSV 파일을 업로드하여 작업지시를 시스템에 등록하세요
        </p>
      </div>

      <div className="card max-w-4xl">
        <ExcelUploader onUploadComplete={handleUploadComplete} />
      </div>

      {uploadResult?.success && uploadResult.isUploaded && (
        <div className="card max-w-4xl">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 text-success-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              작업지시가 성공적으로 등록되었습니다!
            </h3>
            <p className="text-gray-600 mb-4">
              작업게시판으로 이동하여 작업을 확인하세요.
            </p>
            <button
              onClick={() => navigate('/workboard')}
              className="btn btn-primary"
            >
              작업게시판으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  )
}