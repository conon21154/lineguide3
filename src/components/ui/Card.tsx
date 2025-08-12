import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-4 md:p-5',
    lg: 'p-5 md:p-6'
  }

  return (
    <div className={`
      rounded-2xl border border-slate-200 bg-white shadow-sm 
      hover:shadow-md transition-shadow
      ${paddingClasses[padding]}
      ${className}
    `}>
      {children}
    </div>
  )
}
