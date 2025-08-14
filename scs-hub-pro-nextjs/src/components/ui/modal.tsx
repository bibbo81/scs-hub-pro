import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import type { ModalProps } from '@/lib/types'

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ className, isOpen, onClose, title, size = 'md', children, ...props }, ref) => {
    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }, [isOpen, onClose])

    if (!isOpen) return null

    const sizes = {
      sm: 'max-w-md',
      md: 'max-w-lg',
      lg: 'max-w-2xl',
      xl: 'max-w-4xl'
    }

    const modalContent = (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          ref={ref}
          className={cn(
            'relative bg-white rounded-lg shadow-xl',
            'w-full mx-4',
            sizes[size],
            'max-h-[90vh] overflow-hidden',
            'transform transition-all',
            className
          )}
          {...props}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">
                {title}
              </h2>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="p-2 h-auto"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Chiudi</span>
            </Button>
          </div>
          
          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
            {children}
          </div>
        </div>
      </div>
    )

    return createPortal(modalContent, document.body)
  }
)

Modal.displayName = 'Modal'

// Modal subcomponents for more control
const ModalHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-between px-6 py-4 border-b border-gray-200', className)}
      {...props}
    />
  )
)
ModalHeader.displayName = 'ModalHeader'

const ModalTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-gray-900', className)}
      {...props}
    />
  )
)
ModalTitle.displayName = 'ModalTitle'

const ModalContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-6 py-4 overflow-y-auto', className)}
      {...props}
    />
  )
)
ModalContent.displayName = 'ModalContent'

const ModalFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200', className)}
      {...props}
    />
  )
)
ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter }