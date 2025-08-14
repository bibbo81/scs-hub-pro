import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 60) {
    return `${minutes} minuti fa`
  } else if (hours < 24) {
    return `${hours} ore fa`
  } else {
    return `${days} giorni fa`
  }
}

// String utilities
export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

// Tracking utilities
export function detectTrackingType(trackingNumber: string): 'container' | 'awb' | 'bl' | 'parcel' | 'auto' {
  const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase()
  
  // Container patterns
  if (/^[A-Z]{4}\d{7}$/.test(cleaned)) {
    return 'container'
  }
  
  // AWB patterns
  if (/^\d{3}-?\d{8}$/.test(cleaned) || /^\d{11}$/.test(cleaned)) {
    return 'awb'
  }
  
  // B/L patterns  
  if (/^[A-Z]{4}[A-Z0-9]{6,10}$/.test(cleaned)) {
    return 'bl'
  }
  
  // Default to parcel for other patterns
  return 'parcel'
}

export function formatTrackingNumber(trackingNumber: string, type?: string): string {
  const cleaned = trackingNumber.replace(/\s/g, '').toUpperCase()
  
  if (type === 'awb' && cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`
  }
  
  return cleaned
}

// Status utilities
export function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('delivered') || statusLower.includes('consegnato')) {
    return 'success'
  }
  if (statusLower.includes('transit') || statusLower.includes('viaggio')) {
    return 'info'
  }
  if (statusLower.includes('exception') || statusLower.includes('error')) {
    return 'danger'
  }
  if (statusLower.includes('pending') || statusLower.includes('attesa')) {
    return 'warning'
  }
  
  return 'secondary'
}

export function getStatusIcon(status: string): string {
  const statusLower = status.toLowerCase()
  
  if (statusLower.includes('delivered')) return 'check-circle'
  if (statusLower.includes('transit')) return 'truck'
  if (statusLower.includes('exception')) return 'alert-triangle'
  if (statusLower.includes('pending')) return 'clock'
  
  return 'package'
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidTrackingNumber(trackingNumber: string): boolean {
  const cleaned = trackingNumber.replace(/\s/g, '')
  return cleaned.length >= 4 && cleaned.length <= 20
}

// Local storage utilities
export function getFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue
  
  try {
    const item = window.localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.warn(`Error reading from localStorage key "${key}":`, error)
    return defaultValue
  }
}

export function setToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`Error writing to localStorage key "${key}":`, error)
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return
  
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Error removing from localStorage key "${key}":`, error)
  }
}

// API utilities
export function handleApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  if (typeof error === 'string') return error
  return 'Si è verificato un errore imprevisto'
}

export function createSearchParams(params: Record<string, string | number | boolean>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}