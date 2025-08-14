import React from 'react'
import { cn } from '@/lib/utils'
import type { ButtonProps } from '@/lib/types'

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const baseStyles = [
      'inline-flex items-center justify-center rounded-md font-medium',
      'transition-colors duration-fast ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none'
    ]

    const variants = {
      primary: [
        'bg-primary-500 text-white hover:bg-primary-600',
        'focus-visible:ring-primary-500'
      ],
      secondary: [
        'bg-secondary-100 text-secondary-900 hover:bg-secondary-200',
        'focus-visible:ring-secondary-500'
      ],
      success: [
        'bg-success-500 text-white hover:bg-success-600',
        'focus-visible:ring-success-500'
      ],
      warning: [
        'bg-warning-500 text-white hover:bg-warning-600',
        'focus-visible:ring-warning-500'
      ],
      danger: [
        'bg-danger-500 text-white hover:bg-danger-600',
        'focus-visible:ring-danger-500'
      ],
      info: [
        'bg-info-500 text-white hover:bg-info-600',
        'focus-visible:ring-info-500'
      ]
    }

    const sizes = {
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    }

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }