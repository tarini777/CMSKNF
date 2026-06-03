/**
 * MetricCard Component
 * Simple, reusable metric display card
 */

class MetricCard {
    constructor(container, config) {
        this.container = container;
        this.config = {
            label: config.label || 'Metric',
            value: config.value || '0',
            change: config.change || '',
            changeType: config.changeType || 'neutral',
            icon: config.icon || '📊',
            ...config
        };
        
        this.render();
    }
    
    render() {
        const changeClass = this.getChangeClass();
        
        this.container.innerHTML = `
            <div class="metric-card">
                <div class="metric-icon">${this.config.icon}</div>
                <div class="metric-value">${this.config.value}</div>
                <div class="metric-label">${this.config.label}</div>
                <div class="metric-change ${changeClass}">
                    ${this.config.change}
                </div>
            </div>
        `;
    }
    
    getChangeClass() {
        switch (this.config.changeType) {
            case 'positive': return 'positive';
            case 'negative': return 'negative';
            default: return 'neutral';
        }
    }
    
    update(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.render();
    }
}
