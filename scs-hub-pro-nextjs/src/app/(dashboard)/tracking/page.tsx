'use client'

import React, { useState } from 'react'
import { Plus, Search, RefreshCw, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Modal, ModalFooter } from '@/components/ui/modal'
import { formatDate, getStatusColor, detectTrackingType } from '@/lib/utils'
import type { Tracking, TrackingFormData } from '@/lib/types'

// Mock data for development
const mockTrackings: Tracking[] = [
  {
    id: '1',
    user_id: 'demo-user',
    organization_id: 1,
    tracking_number: 'MSKU1234567',
    tracking_type: 'container',
    carrier_name: 'MSK',
    status: 'In Transit',
    origin_port: 'Shanghai',
    destination_port: 'Rotterdam',
    eta: '2024-08-20',
    last_event_date: '2024-08-15T10:30:00Z',
    last_event_location: 'Singapore',
    data_source: 'mock',
    created_at: '2024-08-10T08:00:00Z',
    updated_at: '2024-08-15T10:30:00Z'
  },
  {
    id: '2',
    user_id: 'demo-user',
    organization_id: 1,
    tracking_number: '123-45678901',
    tracking_type: 'awb',
    carrier_name: 'DHL',
    status: 'Delivered',
    origin_port: 'Milano',
    destination_port: 'Roma',
    last_event_date: '2024-08-14T16:45:00Z',
    last_event_location: 'Roma Hub',
    data_source: 'mock',
    created_at: '2024-08-12T09:00:00Z',
    updated_at: '2024-08-14T16:45:00Z'
  }
]

export default function TrackingPage() {
  const [trackings, setTrackings] = useState<Tracking[]>(mockTrackings)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false)
  const [selectedTracking, setSelectedTracking] = useState<Tracking | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState<TrackingFormData>({
    tracking_number: '',
    tracking_type: 'auto'
  })

  const filteredTrackings = trackings.filter(tracking =>
    tracking.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tracking.carrier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tracking.status.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Detect tracking type if auto
      const detectedType = formData.tracking_type === 'auto' 
        ? detectTrackingType(formData.tracking_number)
        : formData.tracking_type

      const newTracking: Tracking = {
        id: Date.now().toString(),
        user_id: 'demo-user',
        organization_id: 1,
        tracking_number: formData.tracking_number.trim().toUpperCase(),
        tracking_type: detectedType === 'auto' ? 'parcel' : (detectedType as 'container' | 'awb' | 'bl' | 'parcel'),
        status: 'Pending',
        data_source: 'mock',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setTrackings(prev => [newTracking, ...prev])
      setFormData({ tracking_number: '', tracking_type: 'auto' })
      setIsAddModalOpen(false)
      
      // Simulate API delay
      setTimeout(() => {
        setTrackings(prev => prev.map(t => 
          t.id === newTracking.id 
            ? { ...t, status: 'In Transit', carrier_name: 'Demo Carrier' }
            : t
        ))
      }, 2000)
    } catch (error) {
      console.error('Error adding tracking:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTracking = (id: string) => {
    setTrackings(prev => prev.filter(t => t.id !== id))
  }

  const handleViewTimeline = (tracking: Tracking) => {
    setSelectedTracking(tracking)
    setIsTimelineModalOpen(true)
  }

  const handleRefreshTracking = async (id: string) => {
    const tracking = trackings.find(t => t.id === id)
    if (!tracking) return

    setTrackings(prev => prev.map(t => 
      t.id === id 
        ? { ...t, status: 'Updating...', updated_at: new Date().toISOString() }
        : t
    ))

    // Simulate API call
    setTimeout(() => {
      setTrackings(prev => prev.map(t => 
        t.id === id 
          ? { 
              ...t, 
              status: 'Updated Status', 
              last_event_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : t
      ))
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="sol-heading-1">Tracking Spedizioni</h1>
          <p className="sol-text-muted mt-1">
            Monitora le tue spedizioni in tempo reale
          </p>
        </div>
        
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Aggiungi Tracking
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Totale</p>
                <p className="text-2xl font-bold text-gray-900">{trackings.length}</p>
              </div>
              <div className="p-2 bg-primary-100 rounded-lg">
                <Search className="h-5 w-5 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Transito</p>
                <p className="text-2xl font-bold text-info-600">
                  {trackings.filter(t => t.status.toLowerCase().includes('transit')).length}
                </p>
              </div>
              <div className="p-2 bg-info-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-info-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Consegnate</p>
                <p className="text-2xl font-bold text-success-600">
                  {trackings.filter(t => t.status.toLowerCase().includes('delivered')).length}
                </p>
              </div>
              <div className="p-2 bg-success-100 rounded-lg">
                <Eye className="h-5 w-5 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Attesa</p>
                <p className="text-2xl font-bold text-warning-600">
                  {trackings.filter(t => t.status.toLowerCase().includes('pending')).length}
                </p>
              </div>
              <div className="p-2 bg-warning-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per numero tracking, corriere o stato..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tracking Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista Tracking ({filteredTrackings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero Tracking</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Corriere</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Origine</TableHead>
                <TableHead>Destinazione</TableHead>
                <TableHead>Ultimo Aggiornamento</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrackings.map((tracking) => (
                <TableRow key={tracking.id}>
                  <TableCell className="font-mono font-medium">
                    {tracking.tracking_number}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{tracking.tracking_type}</span>
                  </TableCell>
                  <TableCell>{tracking.carrier_name || '-'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full bg-${getStatusColor(tracking.status)}-100 text-${getStatusColor(tracking.status)}-800`}>
                      {tracking.status}
                    </span>
                  </TableCell>
                  <TableCell>{tracking.origin_port || '-'}</TableCell>
                  <TableCell>{tracking.destination_port || '-'}</TableCell>
                  <TableCell>
                    {tracking.updated_at ? formatDate(tracking.updated_at) : '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewTimeline(tracking)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRefreshTracking(tracking.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteTracking(tracking.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredTrackings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nessun tracking trovato per la ricerca corrente' : 'Nessun tracking presente'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Tracking Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Aggiungi Nuovo Tracking"
        size="md"
      >
        <form onSubmit={handleAddTracking} className="space-y-4">
          <div>
            <label htmlFor="tracking_number" className="block text-sm font-medium text-gray-700 mb-2">
              Numero Tracking
            </label>
            <input
              id="tracking_number"
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Es: MSKU1234567, 123-45678901"
              value={formData.tracking_number}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_number: e.target.value }))}
            />
            <p className="text-xs text-gray-500 mt-1">
              Il tipo sarà rilevato automaticamente dal formato del numero
            </p>
          </div>

          <div>
            <label htmlFor="tracking_type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo Spedizione
            </label>
            <select
              id="tracking_type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={formData.tracking_type}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_type: e.target.value as 'container' | 'awb' | 'bl' | 'parcel' | 'auto' }))}
            >
              <option value="auto">🤖 Rilevamento Automatico</option>
              <option value="container">🚢 Container</option>
              <option value="awb">✈️ Air Waybill</option>
              <option value="bl">📋 Bill of Lading</option>
              <option value="parcel">📦 Pacco</option>
            </select>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Aggiungendo...' : 'Aggiungi Tracking'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Timeline Modal */}
      <Modal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        title={`Timeline - ${selectedTracking?.tracking_number}`}
        size="lg"
      >
        {selectedTracking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Corriere</p>
                <p className="font-medium">{selectedTracking.carrier_name || 'Non specificato'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Stato Attuale</p>
                <p className="font-medium">{selectedTracking.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Origine</p>
                <p className="font-medium">{selectedTracking.origin_port || 'Non specificato'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Destinazione</p>
                <p className="font-medium">{selectedTracking.destination_port || 'Non specificato'}</p>
              </div>
            </div>

            <div className="text-center py-8 text-gray-500">
              <p>Timeline eventi in sviluppo</p>
              <p className="text-sm">Questa funzionalità sarà disponibile nella prossima versione</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}