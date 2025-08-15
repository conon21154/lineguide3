interface KtMosLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function KtMosLogo({ className = '', size = 'md' }: KtMosLogoProps) {
  const sizeClasses = {
    sm: 'h-4 w-auto',
    md: 'h-5 sm:h-6 w-auto', 
    lg: 'h-8 w-auto'
  }

  return (
    <svg 
      className={`${sizeClasses[size]} ${className}`}
      viewBox="0 0 120 40" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* KT MOS 로고 SVG */}
      <defs>
        <linearGradient id="ktGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E91E63" />
          <stop offset="100%" stopColor="#F44336" />
        </linearGradient>
      </defs>
      
      {/* KT 부분 */}
      <rect x="5" y="8" width="18" height="24" rx="2" fill="url(#ktGradient)" />
      <text x="14" y="24" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">KT</text>
      
      {/* MOS 부분 */}
      <rect x="28" y="12" width="84" height="16" rx="2" fill="currentColor" opacity="0.8" />
      <text x="70" y="22" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">MOS</text>
    </svg>
  )
}