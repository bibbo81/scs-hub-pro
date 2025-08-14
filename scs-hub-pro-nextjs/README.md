# SCS Hub Pro - Next.js 14

Migrazione moderna della piattaforma di gestione supply chain da HTML/CSS/JS vanilla a Next.js 14 con TypeScript e Tailwind CSS.

## 🚀 Stack Tecnologico

- **Next.js 14.2+** con App Router
- **TypeScript 5.3+** strict mode
- **Tailwind CSS 4.0+** per styling con design system Solarium
- **Supabase** client per database esistente
- **Lucide React** per icone
- **Date-fns** per gestione date

## 📋 Prerequisiti

- Node.js 18+
- npm o yarn
- Accesso al database Supabase esistente

## ⚡ Quick Start

1. **Installazione dipendenze**
   ```bash
   npm install
   ```

2. **Configurazione environment**
   ```bash
   cp .env.example .env.local
   ```
   
   Aggiorna `.env.local` con le credenziali Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://gnlrmnsdmpjzitsysowq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Avvio development server**
   ```bash
   npm run dev
   ```

4. **Apri il browser**
   Naviga su [http://localhost:3000](http://localhost:3000)

## 🏗️ Struttura Progetto

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/           # Autenticazione (futuro)
│   ├── (dashboard)/         # Route group per dashboard
│   │   ├── tracking/        # 🎯 Prima pagina migrata
│   │   ├── dashboard/       # Homepage dashboard
│   │   └── layout.tsx       # Layout con header/sidebar
│   ├── globals.css          # Solarium design system
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Redirect alla dashboard
├── components/
│   ├── ui/                  # Componenti UI base
│   │   ├── button.tsx       # Button component
│   │   ├── card.tsx         # Card component
│   │   ├── table.tsx        # Table component
│   │   └── modal.tsx        # Modal component
│   └── layout/
│       └── header.tsx       # Header e Sidebar
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Supabase client-side
│   │   └── server.ts        # Supabase server-side
│   ├── utils/
│   │   └── index.ts         # Utility functions
│   └── types/
│       └── index.ts         # TypeScript types
└── styles/                  # Stili aggiuntivi (se necessari)
```

## 🎨 Design System Solarium

Il design system Solarium è stato completamente migrato a Tailwind CSS 4.0 mantenendo tutti i colori, spacing e component styles originali.

### Colori Principali
- **Primary**: `#6366f1` (Indigo)
- **Success**: `#10b981` (Emerald) 
- **Warning**: `#f59e0b` (Amber)
- **Danger**: `#ef4444` (Red)
- **Info**: `#3b82f6` (Blue)

### Classi Utility
```css
.sol-heading-1      /* Titoli principali */
.sol-heading-2      /* Titoli sezione */
.sol-text-body      /* Testo normale */
.sol-text-muted     /* Testo secondario */
.sol-card           /* Card container */
.sol-button-base    /* Base button styles */
```

## 🔌 Integrazione Supabase

### Database Schema
Il progetto mantiene compatibilità con il database esistente:

```typescript
interface Tracking {
  id: string
  user_id: string
  organization_id: number
  tracking_number: string
  tracking_type: 'container' | 'awb' | 'bl' | 'parcel'
  carrier_code?: string
  carrier_name?: string
  status: string
  // ... altri campi
}
```

### Client Usage
```typescript
import { supabase } from '@/lib/supabase/client'

// Per client components
const { data, error } = await supabase
  .from('trackings')
  .select('*')
  .eq('user_id', userId)
```

### Server Usage
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Per server components
const supabase = await createServerSupabaseClient()
const { data, error } = await supabase
  .from('trackings')
  .select('*')
```

## 📄 Pagine Implementate

### ✅ Dashboard (`/dashboard`)
- Statistiche overview
- Tracking recenti
- Azioni rapide
- Cards informativi

### ✅ Tracking (`/tracking`)
- Lista tracking con filtri
- Aggiunta nuovo tracking
- Auto-rilevamento tipo spedizione
- Visualizzazione timeline (placeholder)
- Azioni CRUD complete

### 🚧 In Sviluppo
- Autenticazione (`/login`)
- Report e analytics
- Gestione team
- Impostazioni sistema

## 🧪 Testing

```bash
# Build production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## 🔧 Utilities e Helpers

### Rilevamento Automatico Tipo Tracking
```typescript
import { detectTrackingType } from '@/lib/utils'

const type = detectTrackingType('MSKU1234567') // -> 'container'
const type = detectTrackingType('123-45678901') // -> 'awb'
```

### Formattazione Date
```typescript
import { formatDate, formatRelativeTime } from '@/lib/utils'

const formatted = formatDate('2024-08-15T10:30:00Z') // -> "15 ago 2024, 10:30"
const relative = formatRelativeTime('2024-08-15T10:30:00Z') // -> "2 ore fa"
```

### Status Colors
```typescript
import { getStatusColor, getStatusIcon } from '@/lib/utils'

const color = getStatusColor('In Transit') // -> 'info'
const icon = getStatusIcon('Delivered') // -> 'check-circle'
```

## 🚀 Deployment

### Build per Produzione
```bash
npm run build
```

### Variabili Environment Produzione
```env
NEXT_PUBLIC_SUPABASE_URL=https://gnlrmnsdmpjzitsysowq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=production_anon_key
SUPABASE_SERVICE_ROLE_KEY=production_service_role_key
```

## 📚 Prossimi Passi

1. **Completare migrazione pagine**
   - Autenticazione e login
   - Reports e analytics
   - Gestione prodotti

2. **Miglioramenti funzionali**
   - Real-time updates con Supabase Realtime
   - Notifiche push
   - Export dati avanzati

3. **Performance ottimizzazioni**
   - Server-side rendering
   - Image optimization
   - Code splitting automatico

## 🆘 Troubleshooting

### Errori Comuni

**Tailwind classes non applicate**
- Verifica che il file sia incluso nel `content` di Tailwind
- Controlla la sintassi delle classi custom Solarium

**Errori Supabase connection**
- Verifica le variabili environment in `.env.local`
- Controlla che l'URL e le chiavi siano corrette

**TypeScript errors**
- Esegui `npm run lint` per vedere tutti gli errori
- Verifica che tutti i types siano importati correttamente

## 📞 Supporto

Per domande o problemi:
1. Controlla la documentazione esistente
2. Verifica la compatibilità con il sistema legacy
3. Consulta i logs di sviluppo per errori specifici

---

**Versione**: 1.0.0  
**Ultima modifica**: Agosto 2024  
**Compatibilità**: Node.js 18+, database Supabase esistente
