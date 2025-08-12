import React from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  children, 
  ...props 
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E60012]/30 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantClasses = {
    primary: 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
    ghost: 'hover:bg-slate-100 text-slate-700',
    danger: 'bg-[#E60012] hover:bg-[#C50010] text-white shadow-sm'
  }
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-11 px-6 text-sm'
  }

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
