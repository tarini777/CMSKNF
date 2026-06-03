/**
 * RulesManager Component
 * Simple, modular rules management component
 */

class RulesManager {
    constructor(container, config) {
        this.container = container;
        this.config = {
            onRuleAdded: config.onRuleAdded || (() => {}),
            onRuleUpdated: config.onRuleUpdated || (() => {}),
            onRuleDeleted: config.onRuleDeleted || (() => {}),
            ...config
        };
        
        this.rules = [];
        this.render();
        this.loadRules();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="rules-manager">
                <div class="rules-header">
                    <h3>Company Rules Management</h3>
                    <button class="btn btn-primary" id="add-rule-btn">Add New Rule</button>
                </div>
                
                <div class="rules-list" id="rules-list">
                    <div class="loading">Loading rules...</div>
                </div>
                
                <!-- Add/Edit Rule Modal -->
                <div class="modal" id="rule-modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3 id="modal-title">Add New Rule</h3>
                            <span class="close" id="close-modal">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="rule-form">
                                <div class="form-group">
                                    <label for="rule-name">Rule Name</label>
                                    <input type="text" id="rule-name" required>
                                </div>
                                
                                <div class="form-group">
                                    <label for="rule-description">Description</label>
                                    <textarea id="rule-description" rows="3"></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="rule-type">Rule Type</label>
                                    <select id="rule-type" required>
                                        <option value="reportable">Reportable</option>
                                        <option value="non_reportable">Non-Reportable</option>
                                        <option value="conditional">Conditional</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="rule-priority">Priority</label>
                                    <input type="number" id="rule-priority" value="100" min="1" max="1000">
                                </div>
                                
                                <div class="form-group">
                                    <label>Conditions</label>
                                    <div id="conditions-container">
                                        <div class="condition-row">
                                            <select class="condition-field">
                                                <option value="total_amount_of_payment_usdollars">Payment Amount</option>
                                                <option value="covered_recipient_type">Recipient Type</option>
                                                <option value="nature_of_payment_or_transfer_of_value">Nature of Payment</option>
                                                <option value="charity_indicator">Charity Indicator</option>
                                                <option value="third_party_payment_recipient_indicator">Third Party Payment</option>
                                            </select>
                                            <select class="condition-operator">
                                                <option value="==">Equals</option>
                                                <option value="!=">Not Equals</option>
                                                <option value=">">Greater Than</option>
                                                <option value=">=">Greater Than or Equal</option>
                                                <option value="<">Less Than</option>
                                                <option value="<=">Less Than or Equal</option>
                                                <option value="contains">Contains</option>
                                            </select>
                                            <input type="text" class="condition-value" placeholder="Value">
                                            <button type="button" class="btn btn-danger btn-sm remove-condition">Remove</button>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-secondary btn-sm" id="add-condition">Add Condition</button>
                                </div>
                                
                                <div class="form-actions">
                                    <button type="submit" class="btn btn-primary">Save Rule</button>
                                    <button type="button" class="btn btn-secondary" id="cancel-rule">Cancel</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Add rule button
        document.getElementById('add-rule-btn').addEventListener('click', () => {
            this.showModal();
        });
        
        // Close modal
        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('cancel-rule').addEventListener('click', () => {
            this.hideModal();
        });
        
        // Add condition button
        document.getElementById('add-condition').addEventListener('click', () => {
            this.addCondition();
        });
        
        // Form submission
        document.getElementById('rule-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveRule();
        });
        
        // Remove condition buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-condition')) {
                e.target.closest('.condition-row').remove();
            }
        });
    }
    
    async loadRules() {
        try {
            const response = await fetch('http://localhost:5001/api/rules');
            const data = await response.json();
            
            if (data.success) {
                this.rules = data.rules_summary.rules;
                this.renderRules();
            } else {
                this.showError('Failed to load rules');
            }
        } catch (error) {
            this.showError('Error loading rules: ' + error.message);
        }
    }
    
    renderRules() {
        const rulesList = document.getElementById('rules-list');
        
        if (this.rules.length === 0) {
            rulesList.innerHTML = '<div class="no-rules">No rules found. Add your first rule to get started.</div>';
            return;
        }
        
        rulesList.innerHTML = this.rules.map(rule => `
            <div class="rule-card">
                <div class="rule-header">
                    <h4>${rule.rule_name}</h4>
                    <div class="rule-actions">
                        <button class="btn btn-sm btn-secondary edit-rule" data-rule-id="${rule.rule_id}">Edit</button>
                        <button class="btn btn-sm btn-danger delete-rule" data-rule-id="${rule.rule_id}">Delete</button>
                    </div>
                </div>
                <div class="rule-body">
                    <p class="rule-description">${rule.rule_description}</p>
                    <div class="rule-meta">
                        <span class="rule-type ${rule.rule_type}">${rule.rule_type.replace('_', ' ')}</span>
                        <span class="rule-priority">Priority: ${rule.priority}</span>
                    </div>
                    <div class="rule-conditions">
                        <strong>Conditions:</strong>
                        <ul>
                            ${rule.conditions.map(condition => 
                                `<li>${condition.field} ${condition.operator} ${condition.value}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners for edit/delete buttons
        rulesList.querySelectorAll('.edit-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = e.target.dataset.ruleId;
                this.editRule(ruleId);
            });
        });
        
        rulesList.querySelectorAll('.delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = e.target.dataset.ruleId;
                this.deleteRule(ruleId);
            });
        });
    }
    
    showModal(rule = null) {
        const modal = document.getElementById('rule-modal');
        const title = document.getElementById('modal-title');
        
        if (rule) {
            title.textContent = 'Edit Rule';
            this.populateForm(rule);
        } else {
            title.textContent = 'Add New Rule';
            this.clearForm();
        }
        
        modal.style.display = 'block';
    }
    
    hideModal() {
        document.getElementById('rule-modal').style.display = 'none';
    }
    
    clearForm() {
        document.getElementById('rule-form').reset();
        document.getElementById('conditions-container').innerHTML = `
            <div class="condition-row">
                <select class="condition-field">
                    <option value="total_amount_of_payment_usdollars">Payment Amount</option>
                    <option value="covered_recipient_type">Recipient Type</option>
                    <option value="nature_of_payment_or_transfer_of_value">Nature of Payment</option>
                    <option value="charity_indicator">Charity Indicator</option>
                    <option value="third_party_payment_recipient_indicator">Third Party Payment</option>
                </select>
                <select class="condition-operator">
                    <option value="==">Equals</option>
                    <option value="!=">Not Equals</option>
                    <option value=">">Greater Than</option>
                    <option value=">=">Greater Than or Equal</option>
                    <option value="<">Less Than</option>
                    <option value="<=">Less Than or Equal</option>
                    <option value="contains">Contains</option>
                </select>
                <input type="text" class="condition-value" placeholder="Value">
                <button type="button" class="btn btn-danger btn-sm remove-condition">Remove</button>
            </div>
        `;
    }
    
    populateForm(rule) {
        document.getElementById('rule-name').value = rule.rule_name;
        document.getElementById('rule-description').value = rule.rule_description;
        document.getElementById('rule-type').value = rule.rule_type;
        document.getElementById('rule-priority').value = rule.priority;
        
        // Populate conditions
        const container = document.getElementById('conditions-container');
        container.innerHTML = rule.conditions.map(condition => `
            <div class="condition-row">
                <select class="condition-field">
                    <option value="total_amount_of_payment_usdollars" ${condition.field === 'total_amount_of_payment_usdollars' ? 'selected' : ''}>Payment Amount</option>
                    <option value="covered_recipient_type" ${condition.field === 'covered_recipient_type' ? 'selected' : ''}>Recipient Type</option>
                    <option value="nature_of_payment_or_transfer_of_value" ${condition.field === 'nature_of_payment_or_transfer_of_value' ? 'selected' : ''}>Nature of Payment</option>
                    <option value="charity_indicator" ${condition.field === 'charity_indicator' ? 'selected' : ''}>Charity Indicator</option>
                    <option value="third_party_payment_recipient_indicator" ${condition.field === 'third_party_payment_recipient_indicator' ? 'selected' : ''}>Third Party Payment</option>
                </select>
                <select class="condition-operator">
                    <option value="==" ${condition.operator === '==' ? 'selected' : ''}>Equals</option>
                    <option value="!=" ${condition.operator === '!=' ? 'selected' : ''}>Not Equals</option>
                    <option value=">" ${condition.operator === '>' ? 'selected' : ''}>Greater Than</option>
                    <option value=">=" ${condition.operator === '>=' ? 'selected' : ''}>Greater Than or Equal</option>
                    <option value="<" ${condition.operator === '<' ? 'selected' : ''}>Less Than</option>
                    <option value="<=" ${condition.operator === '<=' ? 'selected' : ''}>Less Than or Equal</option>
                    <option value="contains" ${condition.operator === 'contains' ? 'selected' : ''}>Contains</option>
                </select>
                <input type="text" class="condition-value" value="${condition.value}">
                <button type="button" class="btn btn-danger btn-sm remove-condition">Remove</button>
            </div>
        `).join('');
    }
    
    addCondition() {
        const container = document.getElementById('conditions-container');
        const newCondition = document.createElement('div');
        newCondition.className = 'condition-row';
        newCondition.innerHTML = `
            <select class="condition-field">
                <option value="total_amount_of_payment_usdollars">Payment Amount</option>
                <option value="covered_recipient_type">Recipient Type</option>
                <option value="nature_of_payment_or_transfer_of_value">Nature of Payment</option>
                <option value="charity_indicator">Charity Indicator</option>
                <option value="third_party_payment_recipient_indicator">Third Party Payment</option>
            </select>
            <select class="condition-operator">
                <option value="==">Equals</option>
                <option value="!=">Not Equals</option>
                <option value=">">Greater Than</option>
                <option value=">=">Greater Than or Equal</option>
                <option value="<">Less Than</option>
                <option value="<=">Less Than or Equal</option>
                <option value="contains">Contains</option>
            </select>
            <input type="text" class="condition-value" placeholder="Value">
            <button type="button" class="btn btn-danger btn-sm remove-condition">Remove</button>
        `;
        container.appendChild(newCondition);
    }
    
    async saveRule() {
        const formData = this.getFormData();
        
        try {
            const url = formData.rule_id ? `http://localhost:5001/api/rules/${formData.rule_id}` : 'http://localhost:5001/api/rules';
            const method = formData.rule_id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.hideModal();
                this.loadRules();
                this.config.onRuleAdded(data.rule);
            } else {
                this.showError(data.error || 'Failed to save rule');
            }
        } catch (error) {
            this.showError('Error saving rule: ' + error.message);
        }
    }
    
    getFormData() {
        const conditions = Array.from(document.querySelectorAll('.condition-row')).map(row => ({
            field: row.querySelector('.condition-field').value,
            operator: row.querySelector('.condition-operator').value,
            value: row.querySelector('.condition-value').value
        }));
        
        return {
            rule_name: document.getElementById('rule-name').value,
            rule_description: document.getElementById('rule-description').value,
            rule_type: document.getElementById('rule-type').value,
            priority: parseInt(document.getElementById('rule-priority').value),
            conditions: conditions,
            is_active: true
        };
    }
    
    editRule(ruleId) {
        const rule = this.rules.find(r => r.rule_id === ruleId);
        if (rule) {
            this.showModal(rule);
        }
    }
    
    async deleteRule(ruleId) {
        if (!confirm('Are you sure you want to delete this rule?')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:5001/api/rules/${ruleId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.loadRules();
                this.config.onRuleDeleted(ruleId);
            } else {
                this.showError(data.error || 'Failed to delete rule');
            }
        } catch (error) {
            this.showError('Error deleting rule: ' + error.message);
        }
    }
    
    showError(message) {
        alert('Error: ' + message);
    }
}
