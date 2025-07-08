# # SCS Hub Pro 🚀

> **Transform your supply chain chaos into clarity.** Real-time tracking, intelligent insights, and seamless logistics management - all in one powerful platform.

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Platform](https://img.shields.io/badge/platform-web-blue)]()
[![ES6](https://img.shields.io/badge/ES6-modules-yellow)]()

## 🎯 Why SCS Hub Pro?

In today's global supply chain, **visibility is everything**. Lost shipments, delayed containers, and fragmented tracking systems cost businesses millions. SCS Hub Pro solves this by unifying all your logistics data into a single, beautiful interface.

### 🌟 Key Benefits

- **Save 3+ hours daily** on manual tracking checks
- **Reduce delays by 40%** with proactive notifications  
- **Cut operational costs** with intelligent route optimization
- **Scale effortlessly** from 10 to 10,000 shipments

---

## ✨ Features

### 📦 Universal Tracking
- Multi-carrier support (MSC, Maersk, CMA-CGM, DHL, FedEx, and more)
- Container, B/L, AWB, and parcel tracking
- Real-time status updates with timeline visualization

### 🚢 ShipsGo Integration
- Direct API connection for maritime tracking
- Automatic vessel schedules and port updates
- CO₂ emissions tracking for sustainability reporting

### 📊 Smart Dashboard
- KPI metrics at a glance
- Predictive analytics for delays
- Custom alerts and notifications
- Export reports in PDF/Excel

### 🔄 Bulk Operations
- Import hundreds of trackings via CSV/Excel
- Batch status updates
- Automated data synchronization
- Smart duplicate detection
- Product import in **replace** mode automatically syncs new CSV headers with your table columns

---

## 🚀 Quick Start

Get up and running in less than 2 minutes:

```bash
# Clone repository
git clone https://github.com/[username]/scs-hub-pro.git
cd scs-hub-pro

# Copy Supabase credentials for local development
cp runtime-config.example.json runtime-config.json

# Start development server
python3 -m http.server 8000 --directory public

# Open in browser
open http://localhost:8000/tracking.html
```

### 🔑 Supabase Configuration

Set the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in your deployment platform. During local development copy `runtime-config.example.json` to `runtime-config.json`. The example file already contains the project's credentials:

```json
{
  "supabaseUrl": "https://gnlrmnsdmpjzitsysowq.supabase.co",
  "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubHJtbnNkbXBqeml0c3lzb3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjMxMzQsImV4cCI6MjA2NTAzOTEzNH0.UoJJoDUoDXGbiWnKNN48qb9PVQWOW_X_MXqAfzTHSaA"
}
```

These values are loaded at runtime by `core/services/supabase-client.js`.

