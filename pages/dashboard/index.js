// public/pages/dashboard/index.js
import { dataService } from '/core/data-service.js';
import { notificationSystem } from '/core/notification-system.js';

/**
 * Dashboard Page Controller
 */
class DashboardController {
    constructor() {
        this.charts = {};
        this.currentPeriod = 30;
        this.refreshInterval = null;
        this.chartColors = {
            primary: '#6366f1',
            success: '#10b981',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6',
            secondary: '#6b7280'
        };
    }

    /**
     * Inizializza dashboard
     */
    async init() {
        console.log('Initializing dashboard...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Carica dati iniziali
        await this.loadDashboardData();
        
        // Setup auto-refresh (ogni 5 minuti)
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData(true);
        }, 5 * 60 * 1000);

        // Subscribe a cambiamenti dati
        this.setupDataSubscriptions();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Period filter
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            this.currentPeriod = parseInt(e.target.value);
            this.loadDashboardData();
        });
    }

    /**
     * Carica tutti i dati dashboard
     */
    async loadDashboardData(silent = false) {
        try {
            if (!silent) {
                notificationSystem.show('Loading dashboard data...', 'info');
            }

            // Carica statistiche
            const stats = await dataService.get('dashboard', {
                period: this.currentPeriod
            });

            // Aggiorna UI
            this.renderKPIs(stats);
            this.renderCharts(stats);
            this.renderTopSuppliers(stats.topSuppliers || []);
            this.renderTopCarriers(stats.topCarriers || []);
            this.renderAlerts(stats.alerts || {});
            this.renderRecentActivity(stats.recentActivities || []);

            if (!silent) {
                notificationSystem.show('Dashboard updated', 'success');
            }

        } catch (error) {
            console.error('Dashboard load error:', error);
            notificationSystem.show('Error loading dashboard data', 'error');
        }
    }

    /**
     * Renderizza KPI cards
     */
    renderKPIs(stats) {
        const kpiGrid = document.getElementById('kpiGrid');
        
        const kpis = [
            {
                label: 'Total Revenue',
                value: this.formatCurrency(stats.totalRevenue || 0),
                change: stats.revenueGrowth || 0,
                icon: 'euro-sign',
                color: 'primary'
            },
            {
                label: 'Total Shipments',
                value: this.formatNumber(stats.totalShipments || 0),
                change: stats.shipmentsGrowth || 0,
                icon: 'package',
                color: 'info'
            },
            {
                label: 'Avg Delivery Time',
                value: `${stats.avgDeliveryTime || 0} days`,
                change: -stats.deliveryTimeChange || 0, // Negative is good
                icon: 'clock',
                color: 'warning'
            },
            {
                label: 'On-time Delivery',
                value: `${stats.onTimeDelivery || 0}%`,
                change: stats.onTimeChange || 0,
                icon: 'check-circle',
                color: 'success'
            }
        ];

        kpiGrid.innerHTML = kpis.map(kpi => `
            <div class="kpi-card">
                <div class="kpi-icon ${kpi.color}">
                    <i class="icon-${kpi.icon}"></i>
                </div>
                <div class="kpi-content">
                    <div class="kpi-label">${kpi.label}</div>
                    <div class="kpi-value">${kpi.value}</div>
                    <div class="kpi-change ${kpi.change >= 0 ? 'positive' : 'negative'}">
                        <i class="icon-trending-${kpi.change >= 0 ? 'up' : 'down'}"></i>
                        ${Math.abs(kpi.change)}%
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderizza grafici
     */
    renderCharts(stats) {
        // Revenue Trend Chart
        this.renderRevenueChart(stats.dailyTrend || []);
        
        // Status Distribution Chart
        this.renderStatusChart(stats.statusBreakdown || {});
    }

    /**
     * Grafico trend revenue
     */
    renderRevenueChart(dailyData) {
        const ctx = document.getElementById('revenueChart');
        
        // Distruggi chart esistente
        const existing = Chart.getChart(ctx);
        if (existing) existing.destroy();

        // Prepara dati
        const labels = dailyData.map(d => this.formatDate(d.date));
        const revenues = dailyData.map(d => d.cost || 0);
        const shipments = dailyData.map(d => d.count || 0);

        this.charts.revenue = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Revenue (€)',
                        data: revenues,
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.chartColors.primary + '20',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Shipments',
                        data: shipments,
                        borderColor: this.chartColors.info,
                        backgroundColor: this.chartColors.info + '20',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.datasetIndex === 0) {
                                        label += new Intl.NumberFormat('it-IT', {
                                            style: 'currency',
                                            currency: 'EUR'
                                        }).format(context.parsed.y);
                                    } else {
                                        label += context.parsed.y;
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        ticks: {
                            callback: function(value) {
                                return '€' + value.toLocaleString();
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        }
                    }
                }
            }
        });
    }

    /**
     * Grafico distribuzione stati
     */
    renderStatusChart(statusData) {
        const ctx = document.getElementById('statusChart');
        
        // Distruggi chart esistente
        const existing = Chart.getChart(ctx);
        if (existing) existing.destroy();

        // Prepara dati
        const labels = Object.keys(statusData);
        const values = Object.values(statusData);
        
        // Mappa colori per stato
        const statusColors = {
            'DELIVERED': this.chartColors.success,
            'IN_TRANSIT': this.chartColors.info,
            'PENDING': this.chartColors.warning,
            'DELAYED': this.chartColors.danger,
            'CANCELLED': this.chartColors.secondary
        };

        const backgroundColors = labels.map(label => 
            statusColors[label] || this.chartColors.secondary
        );

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels.map(l => this.formatStatus(l)),
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Renderizza top suppliers
     */
    renderTopSuppliers(suppliers) {
        const tbody = document.querySelector('#topSuppliersTable tbody');
        
        if (suppliers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = suppliers.map(supplier => `
            <tr>
                <td>
                    <div class="text-primary font-medium">${supplier.name}</div>
                </td>
                <td>${supplier.shipments}</td>
                <td>${this.formatNumber(supplier.quantity)} pcs</td>
                <td>${this.formatCurrency(supplier.cost)}</td>
            </tr>
        `).join('');
    }

    /**
     * Renderizza top carriers
     */
    renderTopCarriers(carriers) {
        const tbody = document.querySelector('#topCarriersTable tbody');
        
        if (carriers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = carriers.map(carrier => `
            <tr>
                <td>
                    <div class="text-primary font-medium">${carrier.name}</div>
                </td>
                <td>${carrier.shipments}</td>
                <td>${this.formatCurrency(carrier.avgCost)}</td>
                <td>
                    <span class="badge ${carrier.onTimeRate >= 90 ? 'badge-success' : carrier.onTimeRate >= 80 ? 'badge-warning' : 'badge-danger'}">
                        ${carrier.onTimeRate || 0}%
                    </span>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Renderizza alerts
     */
    renderAlerts(alerts) {
        const section = document.getElementById('alertsSection');
        const grid = document.getElementById('alertsGrid');
        
        const alertItems = [];
        
        if (alerts.highCostShipments > 0) {
            alertItems.push({
                type: 'warning',
                icon: 'alert-triangle',
                title: 'High Cost Shipments',
                message: `${alerts.highCostShipments} shipments exceed €1000 transport cost`,
                action: 'Review shipments',
                link: '/shipments.html?filter=high_cost'
            });
        }
        
        if (alerts.delayedShipments > 0) {
            alertItems.push({
                type: 'danger',
                icon: 'clock',
                title: 'Delayed Shipments',
                message: `${alerts.delayedShipments} shipments are currently delayed`,
                action: 'View delays',
                link: '/shipments.html?filter=delayed'
            });
        }
        
        if (alerts.missingTracking > 0) {
            alertItems.push({
                type: 'info',
                icon: 'help-circle',
                title: 'Missing Tracking',
                message: `${alerts.missingTracking} shipments without tracking numbers`,
                action: 'Add tracking',
                link: '/shipments.html?filter=no_tracking'
            });
        }

        if (alertItems.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        grid.innerHTML = alertItems.map(alert => `
            <div class="alert-card alert-${alert.type}">
                <div class="alert-icon">
                    <i class="icon-${alert.icon}"></i>
                </div>
                <div class="alert-content">
                    <h4>${alert.title}</h4>
                    <p>${alert.message}</p>
                </div>
                <a href="${alert.link}" class="alert-action">
                    ${alert.action} →
                </a>
            </div>
        `).join('');
    }

    /**
     * Renderizza recent activity
     */
    renderRecentActivity(activities) {
        const timeline = document.getElementById('activityTimeline');
        
        if (activities.length === 0) {
            // Genera attività demo se non ci sono dati
            activities = this.generateDemoActivities();
        }

        timeline.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="icon-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${this.formatTimeAgo(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Genera attività demo
     */
    generateDemoActivities() {
        return [
            {
                type: 'success',
                icon: 'check-circle',
                title: 'Shipment Delivered',
                description: 'Order #2024-1234 delivered to Milan warehouse',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                type: 'info',
                icon: 'upload',
                title: 'Data Import',
                description: '150 new shipments imported via CSV',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
                type: 'warning',
                icon: 'alert-triangle',
                title: 'Delay Alert',
                description: 'Container MSKU1234567 delayed at port',
                timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
            },
            {
                type: 'primary',
                icon: 'truck',
                title: 'New Tracking',
                description: '5 containers added to tracking system',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        ];
    }

    /**
     * Setup data subscriptions
     */
    setupDataSubscriptions() {
        // Subscribe a cambiamenti shipments
        dataService.subscribe('shipments', (change) => {
            console.log('Shipments changed:', change);
            // Ricarica solo KPI, non tutto
            this.loadDashboardData(true);
        });
    }

    /**
     * Export chart as image
     */
    exportChart(chartId) {
        const chart = this.charts[chartId.replace('Chart', '')];
        if (!chart) return;

        const url = chart.toBase64Image();
        const link = document.createElement('a');
        link.download = `${chartId}_${new Date().toISOString().split('T')[0]}.png`;
        link.href = url;
        link.click();
    }

    /**
     * Utility formatters
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(value || 0);
    }

    formatNumber(value) {
        return new Intl.NumberFormat('it-IT').format(value || 0);
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('it-IT', {
            day: 'numeric',
            month: 'short'
        });
    }

    formatStatus(status) {
        const statusMap = {
            'DELIVERED': 'Delivered',
            'IN_TRANSIT': 'In Transit',
            'PENDING': 'Pending',
            'DELAYED': 'Delayed',
            'CANCELLED': 'Cancelled'
        };
        return statusMap[status] || status;
    }

    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }

        return 'Just now';
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        // Destroy charts
        Object.values(this.charts).forEach(chart => chart.destroy());
    }
}

// Inizializza quando DOM è pronto
const dashboard = new DashboardController();

window.dashboardInit = async function() {
    await dashboard.init();
};

// Export per uso globale
window.dashboard = dashboard;