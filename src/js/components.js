// UI Components
class Components {
    constructor() {
        this.modals = {};
        this.toasts = [];
        this.init();
    }

    // Initialize components
    init() {
        this.setupModals();
        this.setupToasts();
        this.setupDropdowns();
    }

    // Setup modals
    setupModals() {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalClose = document.getElementById('modal-close');
        
        if (modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
        }
        
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
    }

    // Setup toasts
    setupToasts() {
        // Toast container is already in HTML
    }

    // Setup dropdowns
    setupDropdowns() {
        const dropdowns = document.querySelectorAll('.dropdown');
        
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            const menu = dropdown.querySelector('.dropdown-menu');
            
            if (toggle && menu) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleDropdown(dropdown);
                });
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('open');
            });
        });
    }

    // Show modal
    showModal(title, content, options = {}) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('modal-content');
        
        if (!modalOverlay || !modalTitle || !modalContent) return;

        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        
        // Add footer if provided
        if (options.footer) {
            const modalFooter = modalOverlay.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = options.footer;
            }
        }
        
        Utils.show(modalOverlay);
        
        // Focus first input
        const firstInput = modalContent.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    // Close modal
    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            Utils.hide(modalOverlay);
        }
    }

    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = this.createToast(message, type);
        container.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            this.removeToast(toast);
        }, duration);
        
        this.toasts.push(toast);
    }

    // Create toast element
    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${iconMap[type] || iconMap.info}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${Utils.sanitizeHtml(message)}</div>
            </div>
            <button class="toast-close" onclick="components.removeToast(this.parentElement)">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        return toast;
    }

    // Remove toast
    removeToast(toast) {
        if (toast && toast.parentElement) {
            toast.parentElement.removeChild(toast);
            const index = this.toasts.indexOf(toast);
            if (index > -1) {
                this.toasts.splice(index, 1);
            }
        }
    }

    // Toggle dropdown
    toggleDropdown(dropdown) {
        const isOpen = dropdown.classList.contains('open');
        
        // Close all other dropdowns
        document.querySelectorAll('.dropdown.open').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('open');
            }
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('open', !isOpen);
    }

    // Create table
    createTable(data, columns, options = {}) {
        const table = document.createElement('table');
        table.className = `table ${options.className || ''}`;
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title;
            if (column.width) {
                th.style.width = column.width;
            }
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        if (data.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = columns.length;
            cell.className = 'text-center';
            cell.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>Nenhum item encontrado</p>
                </div>
            `;
            row.appendChild(cell);
            tbody.appendChild(row);
        } else {
            data.forEach(item => {
                const row = document.createElement('tr');
                
                columns.forEach(column => {
                    const td = document.createElement('td');
                    
                    if (typeof column.render === 'function') {
                        td.innerHTML = column.render(item);
                    } else if (column.key) {
                        td.textContent = item[column.key] || '';
                    }
                    
                    if (column.className) {
                        td.className = column.className;
                    }
                    
                    row.appendChild(td);
                });
                
                tbody.appendChild(row);
            });
        }
        
        table.appendChild(tbody);
        return table;
    }

    // Create form
    createForm(fields, options = {}) {
        const form = document.createElement('form');
        form.className = options.className || '';
        
        fields.forEach(field => {
            const fieldGroup = this.createFormField(field);
            form.appendChild(fieldGroup);
        });
        
        return form;
    }

    // Create form field
    createFormField(field) {
        const group = document.createElement('div');
        group.className = `form-group ${field.className || ''}`;
        
        // Label
        if (field.label) {
            const label = document.createElement('label');
            label.className = 'form-label';
            label.textContent = field.label;
            if (field.required) {
                label.innerHTML += ' <span class="text-error">*</span>';
            }
            group.appendChild(label);
        }
        
        // Input
        let input;
        
        switch (field.type) {
            case 'select':
                input = document.createElement('select');
                input.className = 'form-select';
                if (field.options) {
                    field.options.forEach(option => {
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.textContent = option.label;
                        input.appendChild(optionElement);
                    });
                }
                break;
                
            case 'textarea':
                input = document.createElement('textarea');
                input.className = 'form-textarea';
                input.rows = field.rows || 3;
                break;
                
            default:
                input = document.createElement('input');
                input.type = field.type || 'text';
                input.className = 'form-input';
        }
        
        // Set attributes
        if (field.name) input.name = field.name;
        if (field.id) input.id = field.id;
        if (field.placeholder) input.placeholder = field.placeholder;
        if (field.required) input.required = true;
        if (field.disabled) input.disabled = true;
        if (field.value) input.value = field.value;
        
        group.appendChild(input);
        
        // Help text
        if (field.help) {
            const help = document.createElement('div');
            help.className = 'form-help';
            help.textContent = field.help;
            group.appendChild(help);
        }
        
        // Error message
        if (field.error) {
            const error = document.createElement('div');
            error.className = 'form-error';
            error.textContent = field.error;
            group.appendChild(error);
        }
        
        return group;
    }

    // Create pagination
    createPagination(pagination, onPageChange) {
        const container = document.createElement('div');
        container.className = 'pagination';
        
        const { page, pages, total } = pagination;
        
        if (pages <= 1) return container;
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = `btn btn-outline btn-sm ${page === 1 ? 'disabled' : ''}`;
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = page === 1;
        prevBtn.addEventListener('click', () => {
            if (page > 1) onPageChange(page - 1);
        });
        container.appendChild(prevBtn);
        
        // Page numbers
        const startPage = Math.max(1, page - 2);
        const endPage = Math.min(pages, page + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `btn btn-sm ${i === page ? 'btn-primary' : 'btn-outline'}`;
            pageBtn.textContent = i;
            pageBtn.addEventListener('click', () => onPageChange(i));
            container.appendChild(pageBtn);
        }
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = `btn btn-outline btn-sm ${page === pages ? 'disabled' : ''}`;
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = page === pages;
        nextBtn.addEventListener('click', () => {
            if (page < pages) onPageChange(page + 1);
        });
        container.appendChild(nextBtn);
        
        // Info
        const info = document.createElement('span');
        info.className = 'pagination-info';
        info.textContent = `${total} itens`;
        container.appendChild(info);
        
        return container;
    }

    // Show loading overlay
    showLoadingOverlay(message = 'Carregando...') {
        const overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(overlay);
        return overlay;
    }

    // Hide loading overlay
    hideLoadingOverlay(overlay) {
        if (overlay && overlay.parentElement) {
            overlay.parentElement.removeChild(overlay);
        }
    }

    // Confirm dialog
    showConfirm(message, onConfirm, onCancel = null) {
        const content = `
            <div class="confirm-dialog">
                <p>${Utils.sanitizeHtml(message)}</p>
            </div>
        `;
        
        const footer = `
            <button class="btn btn-outline" onclick="components.closeModal()">Cancelar</button>
            <button class="btn btn-error" onclick="components.closeModal(); (${onConfirm.toString()})()">Confirmar</button>
        `;
        
        this.showModal('Confirmação', content, { footer });
    }
}

// Create global components instance
window.components = new Components();

// Global toast function
window.Utils = window.Utils || {};
Utils.showToast = (message, type, duration) => components.showToast(message, type, duration);
