/**
 * FileUpload Component
 * Simple, reusable file upload component for CMS data
 */

class FileUpload {
    constructor(container, config) {
        this.container = container;
        this.config = {
            accept: config.accept || '.csv',
            maxSize: config.maxSize || 16 * 1024 * 1024, // 16MB
            onUpload: config.onUpload || (() => {}),
            onProgress: config.onProgress || (() => {}),
            onError: config.onError || (() => {}),
            ...config
        };
        
        this.render();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="file-upload-container">
                <div class="file-upload-area" id="file-upload-area">
                    <div class="upload-icon">📁</div>
                    <div class="upload-text">
                        <h3>Upload CMS Data</h3>
                        <p>Drag and drop your CSV file here or click to browse</p>
                        <p class="file-info">Supported: CSV files up to 16MB</p>
                    </div>
                    <input type="file" id="file-input" accept="${this.config.accept}" style="display: none;">
                </div>
                <div class="upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Uploading...</div>
                </div>
                <div class="upload-result" id="upload-result" style="display: none;"></div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        const uploadArea = document.getElementById('file-upload-area');
        const fileInput = document.getElementById('file-input');
        
        // Click to upload
        uploadArea.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
        
        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFile(e.target.files[0]);
            }
        });
    }
    
    handleFile(file) {
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }
        
        // Show progress
        this.showProgress();
        
        // Upload file
        this.uploadFile(file);
    }
    
    validateFile(file) {
        // Check file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showError('Please select a CSV file');
            return false;
        }
        
        // Check file size
        if (file.size > this.config.maxSize) {
            this.showError(`File size must be less than ${this.config.maxSize / (1024 * 1024)}MB`);
            return false;
        }
        
        return true;
    }
    
    uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        fetch('http://localhost:5001/api/upload/cms-data', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            this.hideProgress();
            if (data.success) {
                this.showSuccess(data);
                this.config.onUpload(data);
            } else {
                this.showError(data.error || 'Upload failed');
                this.config.onError(data.error);
            }
        })
        .catch(error => {
            this.hideProgress();
            console.error('Upload error:', error);
            this.showError('Upload failed: ' + error.message);
            this.config.onError(error);
        });
    }
    
    showProgress() {
        document.getElementById('upload-progress').style.display = 'block';
        document.getElementById('upload-result').style.display = 'none';
    }
    
    hideProgress() {
        document.getElementById('upload-progress').style.display = 'none';
    }
    
    showSuccess(data) {
        const resultContainer = document.getElementById('upload-result');
        resultContainer.innerHTML = `
            <div class="upload-success">
                <div class="success-icon">✅</div>
                <h3>Upload Successful!</h3>
                <div class="upload-summary">
                    <div class="summary-item">
                        <span class="label">Total Records:</span>
                        <span class="value">${data.summary.total_records}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Processed:</span>
                        <span class="value">${data.summary.processed_records}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Reportable:</span>
                        <span class="value reportable">${data.summary.reportable_count}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Non-Reportable:</span>
                        <span class="value non-reportable">${data.summary.non_reportable_count}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Errors:</span>
                        <span class="value error">${data.summary.error_count}</span>
                    </div>
                    <div class="summary-item">
                        <span class="label">Success Rate:</span>
                        <span class="value">${data.summary.success_rate.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="session-info">
                    <p><strong>Session ID:</strong> ${data.session_id}</p>
                </div>
                <div class="next-steps">
                    <p>📋 <strong>Next Steps:</strong> Go to "Review & Approval" tab to review AI decisions and make human judgments.</p>
                </div>
            </div>
        `;
        resultContainer.style.display = 'block';
    }
    
    showError(message) {
        const resultContainer = document.getElementById('upload-result');
        resultContainer.innerHTML = `
            <div class="upload-error">
                <div class="error-icon">❌</div>
                <h3>Upload Failed</h3>
                <p>${message}</p>
            </div>
        `;
        resultContainer.style.display = 'block';
    }
}
