
type BrandProps = { className?: string };

export function Brand({ className }: BrandProps) {
  const baseClassName = "flex items-center gap-2";
  
  // className에 text-white가 포함되어 있는지 확인
  const isWhiteText = className?.includes('text-white');
  
  return (
    <div className={baseClassName}>
      {/* KT MOS 로고 */}
      <div className="flex-shrink-0">
        <img 
          src="/kt-mos-logo.png" 
          alt="KT MOS 남부" 
          className="h-4 sm:h-5 w-auto"
        />
      </div>
      
      {/* 메인 타이틀 */}
      <div className="leading-tight ml-3">
        <div 
          className={`text-[24px] sm:text-[28px] font-black tracking-tight ${
            isWhiteText ? '' : 'text-slate-900 dark:text-slate-50'
          }`}
          style={isWhiteText ? { color: 'white' } : undefined}
        >
          LineGuide
        </div>
      </div>
    </div>
  );
}