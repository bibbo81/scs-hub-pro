// Database Types for SCS Hub Pro
// Based on the existing Supabase schema

export interface Database {
  public: {
    Tables: {
      trackings: {
        Row: Tracking
        Insert: Omit<Tracking, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tracking, 'id' | 'created_at'>>
      }
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>
      }
      organization_members: {
        Row: OrganizationMember
        Insert: Omit<OrganizationMember, 'id' | 'created_at'>
        Update: Partial<Omit<OrganizationMember, 'id'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      tracking_type: 'container' | 'awb' | 'bl' | 'parcel'
      tracking_status: 'pending' | 'in_transit' | 'delivered' | 'exception' | 'unknown'
    }
  }
}

export interface Tracking {
  id: string
  user_id: string
  organization_id: number
  tracking_number: string
  tracking_type: 'container' | 'awb' | 'bl' | 'parcel'
  carrier_code?: string
  carrier_name?: string
  status: string
  origin_port?: string
  destination_port?: string
  eta?: string
  last_event_date?: string
  last_event_location?: string
  events?: TrackingEvent[]
  metadata?: Record<string, unknown>
  data_source?: 'api' | 'mock' | 'cache'
  last_update?: string
  created_at: string
  updated_at: string
}

export interface TrackingEvent {
  date: string
  location?: string
  description: string
  status?: string
  details?: string
}

export interface Organization {
  id: number
  name: string
  slug: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  user_id: string
  organization_id: number
  role: string
  created_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface TrackingResponse extends ApiResponse {
  data?: {
    status: string
    events: TrackingEvent[]
    lastUpdate: string
    fromCache?: boolean
    mockData?: boolean
    apiError?: string
  }
}

// Component Props Types
export interface BaseProps {
  children?: React.ReactNode
  className?: string
}

export interface ButtonProps extends BaseProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface CardProps extends BaseProps {
  title?: string
  subtitle?: string
}

export interface ModalProps extends BaseProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// Form Types
export interface TrackingFormData {
  tracking_number: string
  tracking_type?: 'container' | 'awb' | 'bl' | 'parcel' | 'auto'
  carrier_code?: string
}

// Navigation Types
export interface NavItem {
  icon: string
  label: string
  href: string
  badge?: string
  disabled?: boolean
  dev?: boolean
}

export interface BreadcrumbItem {
  label: string
  href?: string
}