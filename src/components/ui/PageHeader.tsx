import React from 'react'
import { cn } from '@/utils/cn'

interface PageHeaderProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  subtitle, 
  children,
  className = '' 
}) => {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-xs md:text-sm text-slate-600">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-2">
          {children}
        </div>
      )}
    </div>
  )
}
