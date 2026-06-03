/**
 * Chart Component
 * Simple, reusable chart component using Chart.js
 */

class ChartComponent {
    constructor(container, config) {
        this.container = container;
        this.config = {
            type: config.type || 'line',
            title: config.title || 'Chart',
            data: config.data || {},
            options: config.options || {},
            ...config
        };
        
        this.chart = null;
        this.render();
    }
    
    render() {
        // Create canvas element
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${Date.now()}`;
        canvas.width = 400;
        canvas.height = 200;
        
        // Create title
        const title = document.createElement('div');
        title.className = 'chart-title';
        title.textContent = this.config.title;
        
        // Clear container and add elements
        this.container.innerHTML = '';
        this.container.appendChild(title);
        this.container.appendChild(canvas);
        
        // Initialize chart
        this.initChart(canvas);
    }
    
    initChart(canvas) {
        const ctx = canvas.getContext('2d');
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            }
        };
        
        const options = { ...defaultOptions, ...this.config.options };
        
        this.chart = new Chart(ctx, {
            type: this.config.type,
            data: this.config.data,
            options: options
        });
    }
    
    update(newData) {
        if (this.chart) {
            this.chart.data = newData;
            this.chart.update();
        }
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
