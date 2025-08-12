import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ExcelUploader from '@/components/ExcelUploader'
import { ExcelParseResult } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Upload as UploadIcon, ArrowRight, Info } from 'lucide-react'

export default function Upload() {
  const [uploadResult, setUploadResult] = useState<ExcelParseResult | null>(null)
  const [countdown, setCountdown] = useState(0)
  const navigate = useNavigate()

  const handleUploadComplete = (result: ExcelParseResult) => {
    setUploadResult(result)
    // 업로드 성공 시 3초 카운트다운 시작
    if (result.success && result.isUploaded) {
      setCountdown(3)
    }
  }

  // 카운트다운 효과
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (countdown === 0 && uploadResult?.success && uploadResult.isUploaded) {
      navigate('/workboard')
    }
  }, [countdown, uploadResult, navigate])

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 bg-slate-50">
      <PageHeader
        title="작업지시 업로드"
        subtitle="Excel 또는 CSV 파일을 업로드하여 작업지시를 시스템에 등록하세요"
      />

      {/* 사이드바 업로드 안내 */}
      <Card className="max-w-4xl">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                빠른 업로드 기능
              </h3>
              <p className="text-slate-600 mb-4">
                대시보드의 사이드바에서 바로 파일을 업로드할 수 있습니다. 
                더 빠르고 편리한 업로드를 위해 사이드바를 활용해보세요!
              </p>
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <UploadIcon className="w-4 h-4" />
                <span>사이드바 → 작업지시 업로드</span>
                <ArrowRight className="w-4 h-4" />
                <span>드래그 앤 드롭으로 간편 업로드</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 기존 업로드 영역 */}
      <Card className="max-w-4xl">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            전체 화면 업로드
          </h3>
          <ExcelUploader onUploadComplete={handleUploadComplete} />
        </div>
      </Card>

      {uploadResult?.success && uploadResult.isUploaded && (
        <Card className="max-w-4xl">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              작업지시가 성공적으로 등록되었습니다!
            </h3>
            <p className="text-slate-600 mb-4">
              {countdown > 0 
                ? `${countdown}초 후 작업게시판으로 자동 이동됩니다.`
                : '작업게시판으로 이동하여 작업을 확인하세요.'
              }
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/workboard')}
            >
              {countdown > 0 ? `작업게시판으로 이동 (${countdown})` : '작업게시판으로 이동'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}