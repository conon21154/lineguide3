import * as React from "react";

type BrandProps = { className?: string };

export function Brand({ className }: BrandProps) {
  const baseClassName = "flex items-center gap-2";
  
  // className에 text-white가 포함되어 있는지 확인
  const isWhiteText = className?.includes('text-white');
  
  return (
    <div className={baseClassName}>
      {/* 메인 타이틀 */}
      <div className="leading-tight">
        <div 
          className={`text-[18px] sm:text-[20px] font-extrabold tracking-tight ${
            isWhiteText ? '' : 'text-slate-900 dark:text-slate-50'
          }`}
          style={isWhiteText ? { color: 'white' } : undefined}
        >
          LineGuide
        </div>
        {/* 서브 타이틀: 모바일에서는 숨김 */}
        <div 
          className={`hidden sm:block text-[11px] font-medium ${
            isWhiteText ? '' : 'text-slate-500 dark:text-slate-400'
          }`}
          style={isWhiteText ? { color: 'rgba(255, 255, 255, 0.8)' } : undefined}
        >
          5G MUX 구축 통합 플랫폼
        </div>
      </div>
    </div>
  );
}