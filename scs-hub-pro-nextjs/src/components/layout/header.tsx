'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Menu, 
  X, 
  BarChart3, 
  Package, 
  Truck, 
  Ship, 
  Upload, 
  FileText, 
  DollarSign,
  Users,
  Settings,
  Bell,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { NavItem } from '@/lib/types'

interface HeaderProps {
  onSidebarToggle?: () => void
  isSidebarOpen?: boolean
}

const mainNavItems: NavItem[] = [
  { icon: 'BarChart3', label: 'Dashboard', href: '/dashboard' },
  { icon: 'Package', label: 'Tracking', href: '/tracking' },
  { icon: 'Package', label: 'Prodotti', href: '/products' },
  { icon: 'Ship', label: 'Spedizioni', href: '/shipments', badge: 'Phase 3' },
  { icon: 'Truck', label: 'Corrieri', href: '/carriers' },
  { icon: 'Upload', label: 'Importa Dati', href: '/import' },
  { icon: 'FileText', label: 'Report', href: '/reports' },
  { icon: 'DollarSign', label: 'Analisi Costi', href: '/costs' },
  { icon: 'Users', label: 'Team', href: '/team' },
  { icon: 'Settings', label: 'Impostazioni', href: '/settings' }
]

const iconMap = {
  BarChart3,
  Package,
  Truck,
  Ship,
  Upload,
  FileText,
  DollarSign,
  Users,
  Settings
}

export function Header({ onSidebarToggle, isSidebarOpen }: HeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden p-2 h-auto"
            onClick={onSidebarToggle}
          >
            {isSidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle menu</span>
          </Button>

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900">SCS Hub Pro</h1>
              <p className="text-xs text-gray-500">Supply Chain Solutions</p>
            </div>
          </Link>
        </div>

        {/* Right section */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="p-2 h-auto"
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            >
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifiche</span>
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-danger-500 rounded-full"></div>
            </Button>

            {/* Notification dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                  Notifiche
                </div>
                <div className="p-4 text-sm text-gray-500">
                  Nessuna notifica al momento
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              className="p-2 h-auto"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <User className="h-5 w-5" />
              <span className="sr-only">Menu utente</span>
            </Button>

            {/* User dropdown */}
            {isUserMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-200">
                  Demo User
                </div>
                <Link 
                  href="/settings" 
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Impostazioni
                </Link>
                <button 
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    // Add logout logic here
                    console.log('Logout')
                  }}
                >
                  Esci
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <nav className="h-full overflow-y-auto p-4">
          <ul className="space-y-1">
            {mainNavItems.map((item) => {
              const IconComponent = iconMap[item.icon as keyof typeof iconMap]
              const active = isActive(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                      active
                        ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                    onClick={onClose}
                  >
                    {IconComponent && <IconComponent className="h-5 w-5" />}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-warning-100 text-warning-800 text-xs px-2 py-1 rounded">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}