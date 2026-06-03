/**
 * Review Manager Component
 * Handles the complete review and approval workflow
 */
class ReviewManager {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = {
            apiBaseUrl: 'http://localhost:5001',
            onSessionSelect: config.onSessionSelect || (() => {}),
            onDecision: config.onDecision || (() => {}),
            ...config
        };
        this.currentSession = null;
        this.currentRecords = [];
        this.currentPage = 1;
        this.currentFilter = 'all';
        this.selectedRecords = new Set();
    }

    async init() {
        console.log('ReviewManager init called');
        this.render();
        console.log('ReviewManager rendered');
        await this.loadAllRecords();
        console.log('ReviewManager records loaded');
        
        // Make sure we're globally accessible
        window.reviewManager = this;
        console.log('ReviewManager set as global:', window.reviewManager);
        
        // Bind event handlers
        this.bindEventHandlers();
    }

    render() {
        const container = document.getElementById(this.containerId);
        container.innerHTML = `
            <div class="review-manager">
                <div class="review-header">
                    <h2>📋 Review & Approval System</h2>
                    <p>Review all processed records and make human decisions</p>
                </div>
                
                <div class="review-content">
                    <!-- All Records Table -->
                    <div class="records-panel">
                        <div class="panel-header">
                            <h3>📊 All Processed Records</h3>
                            <div class="session-actions">
                                <select id="filter-select">
                                    <option value="all">All Records</option>
                                    <option value="reportable">Reportable</option>
                                    <option value="non_reportable">Non-Reportable</option>
                                    <option value="pending">Pending Decisions</option>
                                </select>
                                <button class="btn btn-success" id="bulk-approve-btn" disabled>
                                    ✅ Bulk Approve
                                </button>
                                <button class="btn btn-warning" id="export-all-btn">
                                    📥 Export All
                                </button>
                                <button class="btn btn-primary" id="refresh-btn">
                                    🔄 Refresh
                                </button>
                                <button class="btn btn-info" id="test-btn">
                                    🧪 Test
                                </button>
                            </div>
                        </div>
                        
                        <div class="records-summary" id="records-summary">
                            <div class="summary-stats">
                                <div class="stat">
                                    <span class="label">Total Records:</span>
                                    <span class="value" id="total-count">0</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Reportable:</span>
                                    <span class="value reportable" id="reportable-count">0</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Non-Reportable:</span>
                                    <span class="value non-reportable" id="non-reportable-count">0</span>
                                </div>
                                <div class="stat">
                                    <span class="label">Pending:</span>
                                    <span class="value pending" id="pending-count">0</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="records-table-container">
                            <table class="records-table" id="records-table">
                                <thead>
                                    <tr>
                                        <th><input type="checkbox" id="select-all"></th>
                                        <th>Session</th>
                                        <th>Recipient Name</th>
                                        <th>Amount</th>
                                        <th>Date</th>
                                        <th>Nature</th>
                                        <th>AI Decision</th>
                                        <th>Reason</th>
                                        <th>Human Decision</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="records-tbody">
                                    <tr>
                                        <td colspan="10" class="loading">Loading records...</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="pagination" id="pagination">
                            <!-- Pagination will be inserted here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEventHandlers() {
        console.log('Binding event handlers...');
        
        // Filter dropdown
        const filterSelect = document.getElementById('filter-select');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                console.log('Filter changed to:', e.target.value);
                this.changeFilter(e.target.value);
            });
        }
        
        // Buttons
        const bulkApproveBtn = document.getElementById('bulk-approve-btn');
        if (bulkApproveBtn) {
            bulkApproveBtn.addEventListener('click', () => {
                console.log('Bulk approve clicked');
                this.bulkApprove();
            });
        }
        
        const exportAllBtn = document.getElementById('export-all-btn');
        if (exportAllBtn) {
            exportAllBtn.addEventListener('click', () => {
                console.log('Export all clicked');
                this.exportAll();
            });
        }
        
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Refresh clicked');
                this.refreshRecords();
            });
        }
        
        const testBtn = document.getElementById('test-btn');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                console.log('Test clicked');
                this.testFunctionality();
            });
        }
        
        // Select all checkbox
        const selectAllCheckbox = document.getElementById('select-all');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                console.log('Select all changed:', e.target.checked);
                this.toggleSelectAll(e.target.checked);
            });
        }
        
        // Use event delegation for dynamic content (approve/reject buttons and checkboxes)
        const table = document.getElementById('records-table');
        if (table) {
            table.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-success') && e.target.textContent.includes('✅')) {
                    const recordId = e.target.getAttribute('data-record-id');
                    console.log('Approve clicked for record:', recordId);
                    this.approveRecord(recordId);
                } else if (e.target.classList.contains('btn-danger') && e.target.textContent.includes('❌')) {
                    const recordId = e.target.getAttribute('data-record-id');
                    console.log('Reject clicked for record:', recordId);
                    this.rejectRecord(recordId);
                }
            });
            
            table.addEventListener('change', (e) => {
                if (e.target.classList.contains('record-checkbox')) {
                    const recordId = e.target.getAttribute('data-record-id');
                    console.log('Record checkbox changed:', recordId, e.target.checked);
                    this.toggleRecordSelection(recordId);
                }
            });
        }
        
        console.log('Event handlers bound successfully');
    }

    async loadAllRecords() {
        try {
            // First get all sessions
            const sessionsResponse = await fetch(`${this.config.apiBaseUrl}/api/review/sessions`);
            const sessionsData = await sessionsResponse.json();
            
            if (!sessionsData.success) {
                console.error('Failed to load sessions:', sessionsData.error);
                return;
            }
            
            // Load records from all sessions
            this.allRecords = [];
            for (const session of sessionsData.sessions) {
                try {
                    const recordsResponse = await fetch(`${this.config.apiBaseUrl}/api/review/sessions/${session.session_id}/records?page=1&per_page=1000`);
                    const recordsData = await recordsResponse.json();
                    
                    if (recordsData.success && recordsData.records) {
                        // Add session info to each record
                        const recordsWithSession = recordsData.records.map(record => ({
                            ...record,
                            session_id: session.session_id,
                            session_filename: session.filename,
                            session_upload_time: session.upload_time
                        }));
                        this.allRecords.push(...recordsWithSession);
                    }
                } catch (error) {
                    console.error(`Error loading records for session ${session.session_id}:`, error);
                }
            }
            
            console.log('Loaded records:', this.allRecords.length);
            this.renderAllRecords();
            this.updateSummary();
            
        } catch (error) {
            console.error('Error loading all records:', error);
        }
    }

    async loadSessions() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/sessions`);
            const data = await response.json();
            
            if (data.success) {
                this.renderSessions(data.sessions);
            } else {
                this.showError('Failed to load sessions: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading sessions: ' + error.message);
        }
    }

    renderSessions(sessions) {
        const sessionsList = document.getElementById('sessions-list');
        
        if (sessions.length === 0) {
            sessionsList.innerHTML = `
                <div class="no-sessions">
                    <p>No upload sessions found. Upload a CSV file first.</p>
                </div>
            `;
            return;
        }

        sessionsList.innerHTML = sessions.map(session => `
            <div class="session-item" onclick="reviewManager.selectSession('${session.session_id}')">
                <div class="session-info">
                    <h4>${session.filename}</h4>
                    <p class="session-meta">
                        📅 ${new Date(session.upload_time).toLocaleString()}
                        • 📊 ${session.total_records} records
                    </p>
                </div>
                <div class="session-stats">
                    <div class="stat pending">
                        <span class="count">${session.pending_decisions}</span>
                        <span class="label">Pending</span>
                    </div>
                    <div class="stat approved">
                        <span class="count">${session.approved}</span>
                        <span class="label">Approved</span>
                    </div>
                    <div class="stat rejected">
                        <span class="count">${session.rejected}</span>
                        <span class="label">Rejected</span>
                    </div>
                </div>
                <div class="session-status status-${session.status}">
                    ${session.status.replace('_', ' ').toUpperCase()}
                </div>
            </div>
        `).join('');
    }
    
    renderAllRecords() {
        const tbody = document.getElementById('records-tbody');
        console.log('Rendering records:', this.allRecords ? this.allRecords.length : 0);
        
        if (!this.allRecords || this.allRecords.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="no-data">No records found</td></tr>';
            return;
        }
        
        // Filter records based on current filter
        let filteredRecords = this.allRecords;
        if (this.currentFilter !== 'all') {
            filteredRecords = this.allRecords.filter(record => {
                if (this.currentFilter === 'reportable') return record.is_reportable === true;
                if (this.currentFilter === 'non_reportable') return record.is_reportable === false;
                if (this.currentFilter === 'pending') return record.human_decision === 'pending';
                return true;
            });
        }
        
        // Apply pagination
        const perPage = 20;
        const startIndex = (this.currentPage - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageRecords = filteredRecords.slice(startIndex, endIndex);
        
        tbody.innerHTML = pageRecords.map(record => `
            <tr class="record-row ${record.is_reportable ? 'reportable' : 'non-reportable'}">
                <td>
                    <input type="checkbox" class="record-checkbox" value="${record.record_id}" data-record-id="${record.record_id}">
                </td>
                <td class="session-info">
                    <div class="session-name">${record.session_filename}</div>
                    <div class="session-time">${new Date(record.session_upload_time).toLocaleDateString()}</div>
                </td>
                <td>${record.covered_recipient_name || 'N/A'}</td>
                <td class="amount">$${record.total_amount_of_payment_usdollars || 0}</td>
                <td>${record.date_of_payment || 'N/A'}</td>
                <td>${record.nature_of_payment_or_transfer_of_value || 'N/A'}</td>
                <td class="ai-decision ${record.is_reportable ? 'reportable' : 'non-reportable'}">
                    ${record.is_reportable ? '✅ Reportable' : '❌ Non-Reportable'}
                </td>
                <td class="reason">${record.reason || 'N/A'}</td>
                <td class="human-decision ${record.human_decision}">
                    ${record.human_decision === 'pending' ? '⏳ Pending' : 
                      record.human_decision === 'approve' ? '✅ Approved' : 
                      record.human_decision === 'reject' ? '❌ Rejected' : '⏳ Pending'}
                </td>
                <td class="actions">
                    <button class="btn btn-sm btn-success" data-record-id="${record.record_id}" 
                            ${record.human_decision === 'approve' ? 'disabled' : ''}>
                        ✅
                    </button>
                    <button class="btn btn-sm btn-danger" data-record-id="${record.record_id}"
                            ${record.human_decision === 'reject' ? 'disabled' : ''}>
                        ❌
                    </button>
                </td>
            </tr>
        `).join('');
        
        this.renderPagination(filteredRecords.length, perPage);
    }
    
    updateSummary() {
        if (!this.allRecords) return;
        
        const total = this.allRecords.length;
        const reportable = this.allRecords.filter(r => r.is_reportable === true).length;
        const nonReportable = this.allRecords.filter(r => r.is_reportable === false).length;
        const pending = this.allRecords.filter(r => r.human_decision === 'pending').length;
        
        document.getElementById('total-count').textContent = total;
        document.getElementById('reportable-count').textContent = reportable;
        document.getElementById('non-reportable-count').textContent = nonReportable;
        document.getElementById('pending-count').textContent = pending;
    }

    async selectSession(sessionId) {
        this.currentSession = sessionId;
        this.currentPage = 1;
        this.selectedRecords.clear();
        
        // Show records panel
        document.getElementById('records-panel').style.display = 'block';
        document.getElementById('session-title').textContent = `Session: ${sessionId.substring(0, 8)}...`;
        
        await this.loadSessionRecords();
        this.config.onSessionSelect(sessionId);
    }

    async loadSessionRecords() {
        if (!this.currentSession) return;

        try {
            const response = await fetch(
                `${this.config.apiBaseUrl}/api/review/sessions/${this.currentSession}/records?` +
                `page=${this.currentPage}&per_page=20&filter=${this.currentFilter}`
            );
            const data = await response.json();
            
            if (data.success) {
                this.currentRecords = data.records;
                this.renderRecords(data);
                this.renderPagination(data);
                this.updateBulkActions();
            } else {
                this.showError('Failed to load records: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading records: ' + error.message);
        }
    }

    renderRecords(data) {
        const recordsList = document.getElementById('records-list');
        const recordsSummary = document.getElementById('records-summary');
        
        // Update summary
        recordsSummary.innerHTML = `
            <div class="summary-stats">
                <div class="stat">
                    <span class="count">${data.total}</span>
                    <span class="label">Total Records</span>
                </div>
                <div class="stat">
                    <span class="count">${data.records.filter(r => r.human_decision === 'pending').length}</span>
                    <span class="label">Pending</span>
                </div>
                <div class="stat">
                    <span class="count">${data.records.filter(r => r.human_decision === 'approve').length}</span>
                    <span class="label">Approved</span>
                </div>
                <div class="stat">
                    <span class="count">${data.records.filter(r => r.human_decision === 'reject').length}</span>
                    <span class="label">Rejected</span>
                </div>
            </div>
        `;

        if (data.records.length === 0) {
            recordsList.innerHTML = `
                <div class="no-records">
                    <p>No records found for the selected filter.</p>
                </div>
            `;
            return;
        }

        recordsList.innerHTML = data.records.map(record => `
            <div class="record-item ${record.human_decision}" data-record-id="${record.record_id}">
                <div class="record-header">
                    <div class="record-selection">
                        <input type="checkbox" 
                               ${record.human_decision !== 'pending' ? 'disabled' : ''}
                               onchange="reviewManager.toggleRecordSelection('${record.record_id}', this.checked)">
                    </div>
                    <div class="record-info">
                        <h4>${record.covered_recipient_name || 'Unknown'}</h4>
                        <p class="record-meta">
                            💰 $${record.total_amount_of_payment_usdollars || 0} 
                            • 📅 ${record.date_of_payment || 'N/A'}
                            • 🏥 ${record.covered_recipient_type || 'N/A'}
                        </p>
                    </div>
                    <div class="record-status">
                        <div class="ai-decision ${record.is_reportable ? 'reportable' : 'non-reportable'}">
                            AI: ${record.is_reportable ? 'REPORTABLE' : 'NON-REPORTABLE'}
                        </div>
                        <div class="human-decision ${record.human_decision}">
                            ${record.human_decision === 'pending' ? '⏳ PENDING' : 
                              record.human_decision === 'approve' ? '✅ APPROVED' : 
                              record.human_decision === 'reject' ? '❌ REJECTED' : '📝 MODIFIED'}
                        </div>
                    </div>
                </div>
                
                <div class="record-details">
                    <div class="detail-row">
                        <strong>Nature of Payment:</strong> ${record.nature_of_payment_or_transfer_of_value || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <strong>Form of Payment:</strong> ${record.form_of_payment_or_transfer_of_value || 'N/A'}
                    </div>
                    <div class="detail-row">
                        <strong>AI Reason:</strong> ${record.reason || 'No reason provided'}
                    </div>
                    ${record.human_reason ? `
                        <div class="detail-row">
                            <strong>Human Reason:</strong> ${record.human_reason}
                        </div>
                    ` : ''}
                    ${record.decision_time ? `
                        <div class="detail-row">
                            <strong>Decision Time:</strong> ${new Date(record.decision_time).toLocaleString()}
                        </div>
                    ` : ''}
                </div>
                
                ${record.human_decision === 'pending' ? `
                    <div class="record-actions">
                        <button class="btn btn-success btn-sm" onclick="reviewManager.makeDecision('${record.record_id}', 'approve')">
                            ✅ Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="reviewManager.makeDecision('${record.record_id}', 'reject')">
                            ❌ Reject
                        </button>
                        <button class="btn btn-warning btn-sm" onclick="reviewManager.showModifyModal('${record.record_id}')">
                            📝 Modify
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    renderPagination(data) {
        const pagination = document.getElementById('pagination');
        
        if (data.total_pages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (data.page > 1) {
            paginationHTML += `<button class="btn btn-sm" onclick="reviewManager.changePage(${data.page - 1})">← Previous</button>`;
        }
        
        // Page numbers
        for (let i = Math.max(1, data.page - 2); i <= Math.min(data.total_pages, data.page + 2); i++) {
            paginationHTML += `<button class="btn btn-sm ${i === data.page ? 'active' : ''}" onclick="reviewManager.changePage(${i})">${i}</button>`;
        }
        
        // Next button
        if (data.page < data.total_pages) {
            paginationHTML += `<button class="btn btn-sm" onclick="reviewManager.changePage(${data.page + 1})">Next →</button>`;
        }
        
        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }

    async changePage(page) {
        this.currentPage = page;
        await this.loadSessionRecords();
    }

    async changeFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        await this.loadSessionRecords();
    }

    toggleRecordSelection(recordId, selected) {
        if (selected) {
            this.selectedRecords.add(recordId);
        } else {
            this.selectedRecords.delete(recordId);
        }
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkApproveBtn = document.getElementById('bulk-approve-btn');
        bulkApproveBtn.disabled = this.selectedRecords.size === 0;
    }

    async makeDecision(recordId, decision) {
        const reason = prompt(`Enter reason for ${decision}:`);
        if (reason === null) return; // User cancelled

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/records/${recordId}/decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    decision: decision,
                    reason: reason
                })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`Decision ${decision} recorded successfully`);
                await this.loadSessionRecords();
                this.config.onDecision(recordId, decision);
            } else {
                this.showError('Failed to record decision: ' + data.error);
            }
        } catch (error) {
            this.showError('Error recording decision: ' + error.message);
        }
    }

    async bulkApprove() {
        if (this.selectedRecords.size === 0) return;

        const reason = prompt('Enter reason for bulk approval:');
        if (reason === null) return;

        const decisions = Array.from(this.selectedRecords).map(recordId => ({
            record_id: recordId,
            decision: 'approve',
            reason: reason
        }));

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/sessions/${this.currentSession}/bulk-decision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ decisions })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(`Bulk approval completed: ${data.message}`);
                this.selectedRecords.clear();
                await this.loadSessionRecords();
            } else {
                this.showError('Failed to process bulk approval: ' + data.error);
            }
        } catch (error) {
            this.showError('Error processing bulk approval: ' + error.message);
        }
    }

    async exportSession() {
        if (!this.currentSession) return;

        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/sessions/${this.currentSession}/export?format=csv`);
            const data = await response.json();
            
            if (data.success) {
                // Create and download file
                const blob = new Blob([data.data], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cms_report_${this.currentSession}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                
                this.showSuccess('Export completed successfully');
            } else {
                this.showError('Failed to export: ' + data.error);
            }
        } catch (error) {
            this.showError('Error exporting: ' + error.message);
        }
    }

    async downloadSession() {
        if (!this.currentSession) return;

        try {
            const url = `${this.config.apiBaseUrl}/api/review/sessions/${this.currentSession}/download?format=csv`;
            const a = document.createElement('a');
            a.href = url;
            a.download = `cms_report_${this.currentSession}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            this.showSuccess('Download started');
        } catch (error) {
            this.showError('Error downloading: ' + error.message);
        }
    }

    async refreshSessions() {
        await this.loadSessions();
    }
    
    async refreshRecords() {
        await this.loadAllRecords();
    }
    
    changeFilter(filter) {
        console.log('Changing filter to:', filter);
        this.currentFilter = filter;
        this.currentPage = 1;
        this.renderAllRecords();
        this.updateSummary();
    }
    
    toggleRecordSelection(recordId) {
        if (this.selectedRecords.has(recordId)) {
            this.selectedRecords.delete(recordId);
        } else {
            this.selectedRecords.add(recordId);
        }
        this.updateBulkActions();
    }
    
    toggleSelectAll(checked) {
        const checkboxes = document.querySelectorAll('.record-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
            if (checked) {
                this.selectedRecords.add(checkbox.value);
            } else {
                this.selectedRecords.delete(checkbox.value);
            }
        });
        this.updateBulkActions();
    }
    
    updateBulkActions() {
        const bulkApproveBtn = document.getElementById('bulk-approve-btn');
        bulkApproveBtn.disabled = this.selectedRecords.size === 0;
    }
    
    async approveRecord(recordId) {
        console.log('Approving record:', recordId);
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/records/${recordId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision: 'approve', reason: 'Human approval' })
            });
            
            if (response.ok) {
                this.showSuccess('Record approved successfully');
                await this.refreshRecords();
            } else {
                this.showError('Failed to approve record');
            }
        } catch (error) {
            this.showError('Error approving record: ' + error.message);
        }
    }
    
    async rejectRecord(recordId) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/records/${recordId}/decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision: 'reject', reason: 'Human rejection' })
            });
            
            if (response.ok) {
                this.showSuccess('Record rejected successfully');
                await this.refreshRecords();
            } else {
                this.showError('Failed to reject record');
            }
        } catch (error) {
            this.showError('Error rejecting record: ' + error.message);
        }
    }
    
    async bulkApprove() {
        if (this.selectedRecords.size === 0) return;
        
        try {
            const decisions = Array.from(this.selectedRecords).map(recordId => ({
                record_id: recordId,
                decision: 'approve',
                reason: 'Bulk approval'
            }));
            
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/bulk-decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decisions })
            });
            
            if (response.ok) {
                this.showSuccess(`Approved ${decisions.length} records successfully`);
                this.selectedRecords.clear();
                await this.refreshRecords();
            } else {
                this.showError('Failed to bulk approve records');
            }
        } catch (error) {
            this.showError('Error bulk approving records: ' + error.message);
        }
    }
    
    async exportAll() {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/api/review/export-all?format=csv`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cms_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showSuccess('Export completed successfully');
            } else {
                this.showError('Failed to export records');
            }
        } catch (error) {
            this.showError('Error exporting records: ' + error.message);
        }
    }
    
    renderPagination(totalRecords, perPage) {
        const pagination = document.getElementById('pagination');
        const totalPages = Math.ceil(totalRecords / perPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="btn btn-sm" onclick="reviewManager.goToPage(${this.currentPage - 1})">← Previous</button>`;
        }
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="btn btn-sm ${i === this.currentPage ? 'active' : ''}" onclick="reviewManager.goToPage(${i})">${i}</button>`;
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="btn btn-sm" onclick="reviewManager.goToPage(${this.currentPage + 1})">Next →</button>`;
        }
        
        paginationHTML += '</div>';
        pagination.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        this.currentPage = page;
        this.renderAllRecords();
    }
    
    testFunctionality() {
        console.log('=== TESTING FUNCTIONALITY ===');
        console.log('ReviewManager instance:', this);
        console.log('All records:', this.allRecords ? this.allRecords.length : 'undefined');
        console.log('Current filter:', this.currentFilter);
        console.log('Current page:', this.currentPage);
        console.log('Selected records:', this.selectedRecords.size);
        
        // Test filter change
        console.log('Testing filter change...');
        this.changeFilter('reportable');
        
        // Test if we have records
        if (this.allRecords && this.allRecords.length > 0) {
            console.log('First record:', this.allRecords[0]);
        }
        
        alert('Check console for test results!');
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }

    showError(message) {
        // Simple error notification
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}

// Global instance
let reviewManager;
