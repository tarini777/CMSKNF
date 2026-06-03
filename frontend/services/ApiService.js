/**
 * ApiService
 * Simple, modular API service for backend communication
 */

class ApiService {
    constructor(baseUrl = 'http://localhost:5001') {
        this.baseUrl = baseUrl;
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
            throw error;
        }
    }
    
    // Health check
    async getHealth() {
        return this.request('/api/health');
    }
    
    // Get current metrics
    async getMetrics() {
        return this.request('/api/metrics');
    }
    
    // Get historical metrics
    async getMetricsHistory(hours = 24) {
        return this.request(`/api/metrics/history?hours=${hours}`);
    }
    
    // Get services status
    async getServices() {
        return this.request('/api/services');
    }
}
