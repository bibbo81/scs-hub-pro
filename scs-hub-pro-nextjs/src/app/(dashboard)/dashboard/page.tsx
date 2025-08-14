import React from 'react'
import { BarChart3, Package, TrendingUp, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function DashboardPage() {
  // Mock data for demonstration
  const stats = {
    totalTrackings: 156,
    activeShipments: 23,
    recentActivity: 8,
    totalUsers: 12
  }

  const recentTrackings = [
    { id: '1', number: 'MSKU1234567', status: 'In Transit', carrier: 'MSK', date: '2024-08-15' },
    { id: '2', number: '123-45678901', status: 'Delivered', carrier: 'DHL', date: '2024-08-14' },
    { id: '3', number: 'COSCO987654', status: 'Loading', carrier: 'COSCO', date: '2024-08-13' }
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="sol-heading-1">Dashboard</h1>
          <p className="sol-text-muted mt-1">
            Benvenuto nel tuo centro di controllo logistico
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/tracking">
            <Button>
              <Package className="h-4 w-4 mr-2" />
              Nuovo Tracking
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tracking Attivi</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalTrackings}</p>
                <p className="text-xs text-success-600 mt-1">+12% dal mese scorso</p>
              </div>
              <div className="p-3 bg-primary-100 rounded-xl">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spedizioni</p>
                <p className="text-3xl font-bold text-gray-900">{stats.activeShipments}</p>
                <p className="text-xs text-info-600 mt-1">In transito</p>
              </div>
              <div className="p-3 bg-info-100 rounded-xl">
                <BarChart3 className="h-6 w-6 text-info-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Attività Recenti</p>
                <p className="text-3xl font-bold text-gray-900">{stats.recentActivity}</p>
                <p className="text-xs text-warning-600 mt-1">Nelle ultime 24h</p>
              </div>
              <div className="p-3 bg-warning-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Utenti Attivi</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                <p className="text-xs text-success-600 mt-1">Team members</p>
              </div>
              <div className="p-3 bg-success-100 rounded-xl">
                <Users className="h-6 w-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Trackings */}
        <Card>
          <CardHeader>
            <CardTitle>Tracking Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTrackings.map((tracking) => (
                <div key={tracking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 font-mono text-sm">
                      {tracking.number}
                    </p>
                    <p className="text-sm text-gray-600">{tracking.carrier}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      tracking.status === 'Delivered' 
                        ? 'bg-success-100 text-success-800'
                        : tracking.status === 'In Transit'
                        ? 'bg-info-100 text-info-800'
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                      {tracking.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{tracking.date}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link href="/tracking">
                <Button variant="secondary" className="w-full">
                  Vedi tutti i tracking
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Azioni Rapide</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/tracking">
                <Button variant="secondary" className="w-full justify-start">
                  <Package className="h-4 w-4 mr-3" />
                  Aggiungi Nuovo Tracking
                </Button>
              </Link>
              
              <Button variant="secondary" className="w-full justify-start" disabled>
                <BarChart3 className="h-4 w-4 mr-3" />
                Visualizza Report
                <span className="ml-auto text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded">
                  Presto
                </span>
              </Button>
              
              <Button variant="secondary" className="w-full justify-start" disabled>
                <Users className="h-4 w-4 mr-3" />
                Gestisci Team
                <span className="ml-auto text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded">
                  Presto
                </span>
              </Button>
              
              <Link href="/settings">
                <Button variant="secondary" className="w-full justify-start">
                  <TrendingUp className="h-4 w-4 mr-3" />
                  Impostazioni Sistema
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Welcome Message for New Installation */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto">
              <Package className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Benvenuto in SCS Hub Pro Next.js!
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Questa è la nuova versione basata su Next.js 14 con TypeScript e Tailwind CSS. 
              Il sistema mantiene compatibilità con il database Supabase esistente e include 
              il design system Solarium migrato.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link href="/tracking">
                <Button>
                  Inizia con il Tracking
                </Button>
              </Link>
              <Button variant="secondary" disabled>
                Documentazione
                <span className="ml-2 text-xs bg-warning-100 text-warning-800 px-2 py-1 rounded">
                  In sviluppo
                </span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}