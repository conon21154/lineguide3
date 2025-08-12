import React from 'react'
import { cn } from '@/utils/cn'

interface FieldProps {
  label?: string
  children: React.ReactNode
  className?: string
  required?: boolean
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string
  children: React.ReactNode
}

export const Field: React.FC<FieldProps> = ({ 
  label, 
  children, 
  className = '',
  required = false 
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <label className="block text-xs font-medium text-slate-600">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
    </div>
  )
}

export const Input: React.FC<InputProps> = ({ 
  className = '', 
  ...props 
}) => {
  return (
    <input
      className={cn(
        'w-full h-10 rounded-xl border-slate-300 placeholder:text-slate-400',
        'focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012]',
        'text-sm transition-colors',
        className
      )}
      {...props}
    />
  )
}

export const Select: React.FC<SelectProps> = ({ 
  className = '', 
  children, 
  ...props 
}) => {
  return (
    <select
      className={cn(
        'w-full h-10 rounded-xl border-slate-300',
        'focus-visible:ring-2 focus-visible:ring-[#E60012]/30 focus-visible:border-[#E60012]',
        'text-sm transition-colors bg-white',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
