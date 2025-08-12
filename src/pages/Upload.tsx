import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ExcelUploader from '@/components/ExcelUploader'
import { ExcelParseResult } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'

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

      <Card className="max-w-4xl">
        <ExcelUploader onUploadComplete={handleUploadComplete} />
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