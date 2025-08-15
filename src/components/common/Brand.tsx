import { useState } from 'react'
import ktMosLogoNew from '@/assets/images/kt-mos-logo-new.png'

type BrandProps = { 
  className?: string
}

export function Brand({ className }: BrandProps) {
  const [imageError, setImageError] = useState(false)
  const baseClassName = "flex items-center gap-3"
  
  // className에 text-white가 포함되어 있는지 확인
  const isWhiteText = className?.includes('text-white')
  
  const handleImageError = () => {
    console.warn('KT MOS 로고 이미지 로드 실패 - fallback 텍스트로 표시')
    setImageError(true)
  }
  
  return (
    <div className={`${baseClassName} ${className || ''}`}>
      {/* KT MOS 로고 또는 폴백 */}
      <div className="flex-shrink-0 flex items-center justify-center">
        {!imageError ? (
          <img 
            src={ktMosLogoNew}
            alt="KT MOS"
            className="h-5 sm:h-6 w-auto object-contain"
            onError={handleImageError}
            loading="eager"
          />
        ) : (
          <div className={`text-xs font-bold px-2 py-1 rounded border ${
            isWhiteText 
              ? 'text-white border-white/30 bg-white/10' 
              : 'text-slate-700 border-slate-300 bg-slate-100'
          }`}>
            KT MOS
          </div>
        )}
      </div>
      
      {/* 메인 타이틀 */}
      <div className="flex items-center">
        <div 
          className={`text-[22px] sm:text-[26px] font-black tracking-tight ${
            isWhiteText ? 'text-white' : 'text-slate-900 dark:text-slate-50'
          }`}
        >
          LineGuide
        </div>
      </div>
    </div>
  )
}