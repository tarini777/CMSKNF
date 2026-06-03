/**
 * Main Application
 * Simple, modular JavaScript application for Knowledge Nexus Framework™
 */

class DashboardApp {
    constructor() {
        this.api = new ApiService();
        this.metricCards = [];
        this.charts = [];
        this.refreshInterval = null;
        this.isLoading = false;
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Knowledge Nexus Framework Dashboard...');
        
        try {
            await this.setupUI();
            await this.loadInitialData();
            this.startAutoRefresh();
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
            this.showError('Failed to initialize dashboard');
        }
    }
    
    async setupUI() {
        // Create main dashboard structure
        document.body.innerHTML = `
            <div class="dashboard">
                <div class="header">
                    <h1>Knowledge Nexus Framework™</h1>
                    <p>
                        <span class="status-indicator"></span>
                        Real-time CMS Compliance Dashboard
                    </p>
                </div>
                
                    <!-- Navigation Tabs -->
                    <div class="nav-tabs">
                        <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
                        <button class="tab-btn" data-tab="upload">Data Upload</button>
                        <button class="tab-btn" data-tab="review">Review & Approval</button>
                        <button class="tab-btn" data-tab="rules">Rules Management</button>
                    </div>
                
                <!-- Dashboard Tab -->
                <div class="tab-content active" id="dashboard-tab">
                    <div id="metrics-container" class="metrics-grid"></div>
                    <div id="charts-container" class="charts-grid"></div>
                    <div id="services-container" class="services-grid"></div>
                </div>
                
                    <!-- Upload Tab -->
                    <div class="tab-content" id="upload-tab">
                        <div class="upload-section">
                            <h2>CMS Data Upload</h2>
                            <div id="file-upload-container"></div>
                        </div>
                    </div>
                    
                    <!-- Review Tab -->
                    <div class="tab-content" id="review-tab">
                        <div class="review-section">
                            <div id="review-manager-container"></div>
                        </div>
                    </div>
                    
                    <!-- Rules Tab -->
                    <div class="tab-content" id="rules-tab">
                        <div class="rules-section">
                            <div id="rules-manager-container"></div>
                        </div>
                    </div>
                
                <div id="status-container" class="last-updated"></div>
            </div>
        `;
        
        // Initialize navigation
        this.initNavigation();
        
        // Initialize metric cards
        this.initMetricCards();
        
        // Initialize charts
        this.initCharts();
        
        // Initialize upload component
        this.initFileUpload();
        
            // Initialize rules manager
            this.initRulesManager();
            
            // Initialize review manager
            this.initReviewManager();
    }
    
    initMetricCards() {
        const container = document.getElementById('metrics-container');
        const metrics = [
            { label: 'Data Quality Score', icon: '📊', key: 'data_quality_score', suffix: '%' },
            { label: 'Records Processed', icon: '📈', key: 'records_processed', format: 'number' },
            { label: 'Duplicates Removed', icon: '🧹', key: 'duplicates_removed', format: 'number' },
            { label: 'Validation Errors', icon: '⚠️', key: 'validation_errors', format: 'number' },
            { label: 'Compliance Score', icon: '✅', key: 'compliance_score', suffix: '%' },
            { label: 'Regulatory Rules', icon: '📋', key: 'regulatory_rules', format: 'number' }
        ];
        
        metrics.forEach(metric => {
            const cardContainer = document.createElement('div');
            container.appendChild(cardContainer);
            
            const card = new MetricCard(cardContainer, {
                label: metric.label,
                icon: metric.icon,
                value: '--',
                change: 'Loading...',
                changeType: 'neutral'
            });
            
            this.metricCards.push({ ...metric, card });
        });
    }
    
    initCharts() {
        const container = document.getElementById('charts-container');
        
        // Quality Trends Chart
        const qualityChartContainer = document.createElement('div');
        qualityChartContainer.className = 'chart-card';
        container.appendChild(qualityChartContainer);
        
        const qualityChart = new ChartComponent(qualityChartContainer, {
            title: 'Data Quality Trends',
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Data Quality Score',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }
        });
        
        // Processing Volume Chart
        const processingChartContainer = document.createElement('div');
        processingChartContainer.className = 'chart-card';
        container.appendChild(processingChartContainer);
        
        const processingChart = new ChartComponent(processingChartContainer, {
            title: 'Processing Volume',
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Records Processed',
                    data: [],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            }
        });
        
        this.charts = [
            { name: 'quality', chart: qualityChart },
            { name: 'processing', chart: processingChart }
        ];
    }
    
    initNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                
                // Remove active class from all buttons and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked button and corresponding content
                button.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }
    
    initFileUpload() {
        const container = document.getElementById('file-upload-container');
        this.fileUpload = new FileUpload(container, {
            onUpload: (data) => {
                console.log('File uploaded successfully:', data);
                this.updateStatus('File uploaded and processed successfully');
            },
            onError: (error) => {
                console.error('Upload error:', error);
                this.updateStatus('Upload failed: ' + error);
            }
        });
    }
    
    initRulesManager() {
        const container = document.getElementById('rules-manager-container');
        this.rulesManager = new RulesManager(container, {
            onRuleAdded: (rule) => {
                console.log('Rule added:', rule);
                this.updateStatus('Rule added successfully');
            },
            onRuleUpdated: (rule) => {
                console.log('Rule updated:', rule);
                this.updateStatus('Rule updated successfully');
            },
            onRuleDeleted: (ruleId) => {
                console.log('Rule deleted:', ruleId);
                this.updateStatus('Rule deleted successfully');
            }
        });
    }
    
    initReviewManager() {
        const container = document.getElementById('review-manager-container');
        console.log('ReviewManager container:', container);
        
        if (!container) {
            console.error('ReviewManager container not found!');
            return;
        }
        
        this.reviewManager = new ReviewManager('review-manager-container', {
            onSessionSelect: (sessionId) => {
                console.log('Session selected:', sessionId);
            },
            onDecision: (recordId, decision) => {
                console.log('Decision made:', recordId, decision);
                // Refresh metrics after decision
                this.updateMetrics();
            }
        });
        
        console.log('ReviewManager created:', this.reviewManager);
        this.reviewManager.init();
        
        // Make reviewManager globally accessible for onclick handlers
        window.reviewManager = this.reviewManager;
    }
    
    async loadInitialData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        try {
            // Load current metrics
            const metricsResponse = await this.api.getMetrics();
            this.updateMetrics(metricsResponse.data);
            
            // Load historical data for charts
            const historyResponse = await this.api.getMetricsHistory(24);
            this.updateCharts(historyResponse.data);
            
            // Load services status
            const servicesResponse = await this.api.getServices();
            this.updateServices(servicesResponse.services);
            
            this.updateStatus('Data loaded successfully');
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to load data from API');
        } finally {
            this.isLoading = false;
        }
    }
    
    updateMetrics(data) {
        this.metricCards.forEach(metric => {
            const value = data[metric.key];
            let displayValue = value;
            
            if (metric.format === 'number') {
                displayValue = value.toLocaleString();
            } else if (metric.suffix) {
                displayValue = `${value}${metric.suffix}`;
            }
            
            metric.card.update({
                value: displayValue,
                change: this.generateChangeText(metric.key, value),
                changeType: this.getChangeType(metric.key, value)
            });
        });
    }
    
    updateCharts(historyData) {
        const labels = historyData.map(item => {
            const date = new Date(item.timestamp);
            return date.toLocaleTimeString();
        });
        
        // Update quality chart
        const qualityChart = this.charts.find(c => c.name === 'quality');
        if (qualityChart) {
            qualityChart.chart.update({
                labels: labels,
                datasets: [{
                    label: 'Data Quality Score',
                    data: historyData.map(item => item.data_quality_score),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            });
        }
        
        // Update processing chart
        const processingChart = this.charts.find(c => c.name === 'processing');
        if (processingChart) {
            processingChart.chart.update({
                labels: labels,
                datasets: [{
                    label: 'Records Processed',
                    data: historyData.map(item => item.records_processed),
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            });
        }
    }
    
    updateServices(services) {
        const container = document.getElementById('services-container');
        container.innerHTML = '';
        
        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card';
            serviceCard.innerHTML = `
                <div class="service-name">${service.name}</div>
                <div class="service-status ${service.status}">${service.status}</div>
            `;
            container.appendChild(serviceCard);
        });
    }
    
    generateChangeText(key, value) {
        // Simple change simulation
        const changes = {
            'data_quality_score': '+0.3% from last hour',
            'records_processed': '+1,200 this hour',
            'duplicates_removed': '+45 today',
            'validation_errors': '-2 from yesterday',
            'compliance_score': '+0.1% this week',
            'regulatory_rules': '+3 new rules'
        };
        
        return changes[key] || 'No change';
    }
    
    getChangeType(key, value) {
        // Simple change type logic
        if (key === 'validation_errors') return 'positive'; // Less errors is good
        return 'positive'; // Most metrics are positive when they increase
    }
    
    updateStatus(message) {
        const container = document.getElementById('status-container');
        const timestamp = new Date().toLocaleTimeString();
        container.textContent = `${message} | Last updated: ${timestamp} | Auto-refresh every 10 seconds`;
    }
    
    showError(message) {
        const container = document.getElementById('status-container');
        container.innerHTML = `<div class="error">${message}</div>`;
    }
    
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            this.loadInitialData();
        }, 10000); // Refresh every 10 seconds
    }
    
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DashboardApp();
});
