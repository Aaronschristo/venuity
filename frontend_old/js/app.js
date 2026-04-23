// =====================================================================
// Venuity app.js — Static frontend version
// All fetch() calls use window.APP_CONFIG.API_BASE (set in config.js)
// =====================================================================

// Convenience getter — always reads latest config
const API = () => (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';

// XSS Sanitizer
const escapeHTML = (str) => {
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
};

// Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = type === 'success' ? 'bx-check-circle' : 'bx-x-circle';
    const color = type === 'success' ? 'var(--success)' : 'var(--danger)';
    
    toast.innerHTML = `
        <i class='bx ${icon}' style='font-size: 24px; color: ${color}'></i>
        <div style="font-weight: 500;">${message}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Modal Handle
function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    }
}

// Download QR
function downloadQR() {
    const img = document.getElementById('qr-image');
    if(img.src) {
        let a = document.createElement('a');
        a.href = img.src;
        a.download = `QR_${document.getElementById('qr-customer-name').innerText}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// Formatting
const formatCurrency = (val) => (window.CURRENCY_SYMBOL || '₹') + parseFloat(val).toFixed(2);

// Theme Toggle
function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if(isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        document.getElementById('theme-toggle-icon').className = 'bx bx-moon';
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        document.getElementById('theme-toggle-icon').className = 'bx bx-sun';
    }
}

// -------------------------------------------------------
// Init: Active Nav Link
// -------------------------------------------------------
function initNavActiveState() {
    const filename = window.location.pathname.split('/').pop() || 'index.html';
    const map = {
        'index.html': 'nav-home',
        '': 'nav-home',
        'dashboard.html': 'nav-dashboard',
        'customers.html': 'nav-customers',
        'recharge.html': 'nav-recharge',
        'scan.html': 'nav-scan',
        'analytics.html': 'nav-analytics',
        'settings.html': 'nav-settings'
    };
    const activeId = map[filename];
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

// -------------------------------------------------------
// Init: Load settings from API and apply to page
// -------------------------------------------------------
function initSettings() {
    // Fast path: use cached values from localStorage first (no flash)
    const cached = {
        business_name: localStorage.getItem('business_name'),
        currency_symbol: localStorage.getItem('currency_symbol'),
        checkin_fee: localStorage.getItem('checkin_fee')
    };

    if (cached.business_name) applySettings(cached);

    // Then fetch fresh from server
    fetch(`${API()}/api/settings_get`)
        .then(res => res.json())
        .then(settings => {
            // Cache for next load
            localStorage.setItem('business_name', settings.business_name || 'PlayArea Manager');
            localStorage.setItem('currency_symbol', settings.currency_symbol || '₹');
            localStorage.setItem('checkin_fee', settings.checkin_fee || '100.0');
            applySettings(settings);
        })
        .catch(() => {
            // Server unreachable — cached values already applied above
        });
}

function applySettings(settings) {
    const bizName = settings.business_name || 'PlayArea Manager';
    const currSymbol = settings.currency_symbol || '₹';
    const fee = settings.checkin_fee || '100.0';

    // Update global
    window.CURRENCY_SYMBOL = currSymbol;

    // Sidebar business name
    const sidebarName = document.getElementById('sidebar-business-name');
    if (sidebarName) sidebarName.innerText = bizName;

    // Index page hero title — update only the text span, not the whole element (preserves the logo img)
    const indexTitle = document.getElementById('index-business-name-text');
    if (indexTitle) indexTitle.innerText = bizName;

    // Dashboard currency symbol
    const revenueSymbol = document.getElementById('revenue-symbol');
    if (revenueSymbol) revenueSymbol.innerText = currSymbol;

    // All .currency-label spans
    document.querySelectorAll('.currency-label').forEach(el => el.innerText = currSymbol);

    // Recharge page: currency prefix symbol span
    const rechargeCurrSymbol = document.getElementById('recharge-currency-symbol');
    if (rechargeCurrSymbol) rechargeCurrSymbol.innerText = currSymbol;

    // Recharge quick buttons
    const q100 = document.getElementById('quick-100');
    const q500 = document.getElementById('quick-500');
    const q1000 = document.getElementById('quick-1000');
    if (q100) q100.innerText = `${currSymbol}100`;
    if (q500) q500.innerText = `${currSymbol}500`;
    if (q1000) q1000.innerText = `${currSymbol}1000`;

    // Scan page: fee display
    const feeBadge = document.getElementById('fee-badge-display');
    if (feeBadge) feeBadge.innerText = `${currSymbol}${fee}`;
    const feeDeducted = document.getElementById('fee-deducted-display');
    if (feeDeducted) feeDeducted.innerText = `-${currSymbol}${fee} Entry Fee`;

    // Settings page: pre-fill form
    const bizInput = document.getElementById('business_name');
    const feeInput = document.getElementById('checkin_fee');
    const currInput = document.getElementById('currency_symbol');
    if (bizInput) bizInput.value = bizName;
    if (feeInput) feeInput.value = fee;
    if (currInput) currInput.value = currSymbol;
}

// Load theme icon on load
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        document.body.classList.remove("preload");
    }, 50);

    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-toggle-icon');
    if(savedTheme !== 'light' && icon) {
        icon.className = 'bx bx-sun';
    }
});

// Set active nav
initNavActiveState();

// Load settings
initSettings();

// Global customers cache for autocomplete
window.allCustomers = [];

// API Interactions & Page Loaders
document.addEventListener('DOMContentLoaded', () => {
    
    // Sidebar Toggle
    const sidebar = document.querySelector(".sidebar");
    const sidebarBtn = document.querySelector(".sidebarBtn");
    
    // Inject overlay automatically
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    // Inject mobile close button into sidebar directly
    const logoDetails = document.querySelector(".sidebar .logo-details");
    let closeBtn = null;
    if (logoDetails) {
        closeBtn = document.createElement("i");
        closeBtn.className = "bx bx-x mobile-closeBtn";
        closeBtn.style.display = window.innerWidth <= 768 ? "block" : "none";
        closeBtn.style.fontSize = "28px";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.marginLeft = "auto";
        closeBtn.style.marginRight = "15px";
        closeBtn.style.color = "var(--primary-color)";
        logoDetails.style.width = "100%";
        logoDetails.appendChild(closeBtn);

        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });

        window.addEventListener("resize", () => {
            closeBtn.style.display = window.innerWidth <= 768 ? "block" : "none";
        });
    }

    if(sidebarBtn) {
        sidebarBtn.addEventListener("click", () => {
            sidebar.classList.toggle("active");
            if (window.innerWidth <= 768) {
                overlay.classList.toggle("active", sidebar.classList.contains("active"));
            } else {
                if (sidebar.classList.contains("active")) {
                    localStorage.setItem('desktop_sidebar_state', 'closed');
                } else {
                    localStorage.setItem('desktop_sidebar_state', 'open');
                }
            }
        });
    }

    overlay.addEventListener('click', () => {
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
    });

    // Dashboard Stats
    if(document.getElementById('total-customers')) {
        loadDashboardStats();
    }
    
    // Customers Table
    if(document.getElementById('customers-table-body')) {
        loadCustomers();
        
        const searchInput = document.getElementById('customer-search-input');
        if (searchInput) {
            let searchTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimer);
                searchTimer = setTimeout(() => {
                    loadCustomers(e.target.value.trim());
                }, 300);
            });
        }
    }

    // Recharge Autocomplete
    if(document.getElementById('recharge-customer-name')) {
        setupRechargeAutocomplete();
    }
});

function setupRechargeAutocomplete() {
    const nameInput = document.getElementById('recharge-customer-name');
    const idInput = document.getElementById('recharge-customer-id');
    const autocompleteList = document.getElementById('customer-autocomplete-list');

    if(!nameInput) return;

    let debounceTimer;
    nameInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const val = this.value.trim();
        autocompleteList.innerHTML = '';
        
        if (!val) {
            autocompleteList.style.display = 'none';
            idInput.value = '';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetch(`${API()}/api/customers/search?q=${encodeURIComponent(val)}`)
                .then(res => res.json())
                .then(matches => {
                    autocompleteList.innerHTML = '';
                    if (matches.length > 0) {
                        const frag = document.createDocumentFragment();
                        matches.forEach(m => {
                            const div = document.createElement('div');
                            div.style.padding = '10px 15px';
                            div.style.cursor = 'pointer';
                            div.style.borderBottom = '1px dashed var(--glass-border)';
                            div.style.color = 'var(--text-dark)';
                            div.innerHTML = `<strong>${escapeHTML(m.name)}</strong> <small style="color: var(--text-light); float: right;">${escapeHTML(m.id).substring(0,8)}...</small>`;
                            
                            div.addEventListener('click', function() {
                                nameInput.value = m.name;
                                idInput.value = m.id;
                                autocompleteList.style.display = 'none';
                            });
                            
                            div.addEventListener('mouseenter', function() {
                                this.style.background = 'var(--secondary-color)';
                            });
                            div.addEventListener('mouseleave', function() {
                                this.style.background = 'transparent';
                            });

                            frag.appendChild(div);
                        });
                        autocompleteList.appendChild(frag);
                        autocompleteList.style.display = 'block';
                    } else {
                        autocompleteList.style.display = 'none';
                    }
                });
        }, 300);
    });

    document.addEventListener('click', function(e) {
        if (e.target !== nameInput && e.target !== autocompleteList) {
            autocompleteList.style.display = 'none';
        }
    });
}

function loadDashboardStats() {
    fetch(`${API()}/api/stats`)
        .then(res => res.json())
        .then(data => {
            document.getElementById('total-customers').innerText = data.total_customers;
            document.getElementById('total-revenue').innerText = data.total_revenue.toFixed(2);
            
            const tbody = document.getElementById('transactions-table-body');
            tbody.innerHTML = '';
            
            if(data.recent_transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-light)">No recent transactions</td></tr>';
            } else {
                let htmlRows = '';
                data.recent_transactions.forEach(tx => {
                    const isCheckin = tx.type === 'checkin';
                    const badgeClass = tx.type;
                    const amountDisplay = isCheckin ? `-${window.CURRENCY_SYMBOL || '₹'}${tx.amount.toFixed(2)}` : `+${window.CURRENCY_SYMBOL || '₹'}${tx.amount.toFixed(2)}`;
                    const amountColor = isCheckin ? 'var(--text-dark)' : 'var(--success)';
                    const icon = isCheckin ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
                    const iconColor = isCheckin ? 'var(--danger)' : 'var(--success)';
                    htmlRows += `
                        <tr class="table-row">
                            <td data-label="Customer Name">
                                <div class="user-info">
                                    <strong>${escapeHTML(tx.customer_name)}</strong>
                                </div>
                            </td>
                            <td data-label="Type"><span class="badge ${badgeClass}">${tx.type}</span></td>
                            <td data-label="Amount" style="font-weight:600; color: ${amountColor};">
                                <div style="display:flex; align-items:center; gap: 4px; justify-content: flex-end;">
                                    <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px;"></i>
                                    ${amountDisplay}
                                </div>
                            </td>
                            <td data-label="Date" class="text-light">${tx.created_at}</td>
                        </tr>
                    `;
                });
                tbody.innerHTML = htmlRows;
                window.transactionOffset = 10;
                setupInfiniteScroll();
            }
        })
        .catch(err => console.error("Could not load stats", err));
}

let dashboardObserver = null;

function setupInfiniteScroll() {
    const sentinel = document.getElementById('loading-more-transactions');
    if (!sentinel) return;

    if (dashboardObserver) dashboardObserver.disconnect();
    
    sentinel.innerHTML = "<i class='bx bx-loader-alt bx-spin' style='font-size: 20px; vertical-align: middle;'></i> Loading older transactions...";
    sentinel.style.display = 'block';
    sentinel.style.opacity = '0';
    
    window.isLoadingMore = false;
    window.hasMoreTransactions = true;

    dashboardObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !window.isLoadingMore && window.hasMoreTransactions) {
            loadMoreTransactions();
        }
    }, { rootMargin: '150px' });

    dashboardObserver.observe(sentinel);
}

function loadMoreTransactions() {
    window.isLoadingMore = true;
    const sentinel = document.getElementById('loading-more-transactions');
    sentinel.style.display = 'block';
    sentinel.style.opacity = '1';

    fetch(`${API()}/api/transactions?offset=${window.transactionOffset}&limit=10`)
        .then(res => res.json())
        .then(txs => {
            if (txs.length === 0) {
                window.hasMoreTransactions = false;
                sentinel.innerHTML = "<span style='font-size: 13px; opacity: 0.7;'>No more transactions</span>";
                return;
            }
            
            let htmlRows = '';
            txs.forEach(tx => {
                const isCheckin = tx.type === 'checkin';
                const badgeClass = tx.type;
                const amountDisplay = isCheckin ? `-${window.CURRENCY_SYMBOL || '₹'}${tx.amount.toFixed(2)}` : `+${window.CURRENCY_SYMBOL || '₹'}${tx.amount.toFixed(2)}`;
                const amountColor = isCheckin ? 'var(--text-dark)' : 'var(--success)';
                const icon = isCheckin ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
                const iconColor = isCheckin ? 'var(--danger)' : 'var(--success)';
                htmlRows += `
                    <tr class="table-row">
                        <td data-label="Customer Name">
                            <div class="user-info">
                                <strong>${escapeHTML(tx.customer_name)}</strong>
                            </div>
                        </td>
                        <td data-label="Type"><span class="badge ${badgeClass}">${tx.type}</span></td>
                        <td data-label="Amount" style="font-weight:600; color: ${amountColor};">
                            <div style="display:flex; align-items:center; gap: 4px; justify-content: flex-end;">
                                <i class='bx ${icon}' style="color: ${iconColor}; font-size: 18px;"></i>
                                ${amountDisplay}
                            </div>
                        </td>
                        <td data-label="Date" class="text-light">${tx.created_at}</td>
                    </tr>
                `;
            });
            
            document.getElementById('transactions-table-body').insertAdjacentHTML('beforeend', htmlRows);
            window.transactionOffset += txs.length;
            window.isLoadingMore = false;
            
            if (txs.length < 10) {
                window.hasMoreTransactions = false;
                sentinel.style.opacity = '1';
                sentinel.innerHTML = "<span style='font-size: 13px; opacity: 0.7;'>No more transactions</span>";
            } else {
                sentinel.style.opacity = '0';
            }
        })
        .catch(err => {
            console.error("Could not load more transactions", err);
            window.isLoadingMore = false;
            sentinel.style.opacity = '0';
        });
}

function loadCustomers(query = '') {
    const url = query ? `${API()}/api/customers/search?q=${encodeURIComponent(query)}` : `${API()}/api/customers`;
    fetch(url)
        .then(res => res.json())
        .then(data => {
            const tbody = document.getElementById('customers-table-body');
            tbody.innerHTML = '';
            
            if(data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-light)">No customers found</td></tr>';
            } else {
                let htmlRows = '';
                data.forEach(c => {
                    htmlRows += `
                        <tr class="table-row">
                            <td data-label="Name">
                                <div class="user-info">
                                    <strong>${escapeHTML(c.name)}</strong>
                                    <span class="user-id-truncate" title="${escapeHTML(c.id)}">${escapeHTML(c.id)}</span>
                                </div>
                            </td>
                            <td data-label="Balance" style="font-weight:600; color:var(--text-dark)">${formatCurrency(c.balance)}</td>
                            <td data-label="Registered" class="text-light">${c.created_at}</td>
                            <td data-label="Action">
                                <div style="display:flex; gap: 8px; justify-content: flex-end;">
                                    <button class="btn btn-amount" style="padding: 6px 12px; font-size: 13px;" onclick="showQR('${escapeHTML(c.id)}', '${escapeHTML(c.name)}')">
                                        <i class='bx bx-qr'></i> View
                                    </button>
                                    <button class="btn btn-danger-soft" style="padding: 6px 12px; font-size: 13px;" onclick="deleteCustomer('${escapeHTML(c.id)}', '${escapeHTML(c.name)}')">
                                        <i class='bx bx-trash'></i> Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = htmlRows;
                window.customerOffset = 10;
                window.currentCustomerQuery = query;
                setupCustomersInfiniteScroll();
            }
        });
}

let customersObserver = null;

function setupCustomersInfiniteScroll() {
    const sentinel = document.getElementById('loading-more-customers');
    if (!sentinel) return;

    if (customersObserver) customersObserver.disconnect();
    
    sentinel.innerHTML = "<i class='bx bx-loader-alt bx-spin' style='font-size: 20px; vertical-align: middle;'></i> Loading older customers...";
    sentinel.style.display = 'block';
    sentinel.style.opacity = '0';
    
    window.isLoadingMoreCustomers = false;
    window.hasMoreCustomers = true;

    customersObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !window.isLoadingMoreCustomers && window.hasMoreCustomers) {
            loadMoreCustomers();
        }
    }, { rootMargin: '150px' });

    customersObserver.observe(sentinel);
}

function loadMoreCustomers() {
    window.isLoadingMoreCustomers = true;
    const sentinel = document.getElementById('loading-more-customers');
    sentinel.style.display = 'block';
    sentinel.style.opacity = '1';

    const url = window.currentCustomerQuery 
        ? `${API()}/api/customers/search?q=${encodeURIComponent(window.currentCustomerQuery)}&offset=${window.customerOffset}&limit=10` 
        : `${API()}/api/customers?offset=${window.customerOffset}&limit=10`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.length === 0) {
                window.hasMoreCustomers = false;
                sentinel.style.opacity = '1';
                sentinel.innerHTML = "<span style='font-size: 13px; opacity: 0.7;'>No more customers</span>";
                return;
            }
            
            let htmlRows = '';
            data.forEach(c => {
                htmlRows += `
                    <tr class="table-row">
                        <td data-label="Name">
                            <div class="user-info">
                                <strong>${escapeHTML(c.name)}</strong>
                                <span class="user-id-truncate" title="${escapeHTML(c.id)}">${escapeHTML(c.id)}</span>
                            </div>
                        </td>
                        <td data-label="Balance" style="font-weight:600; color:var(--text-dark)">${formatCurrency(c.balance)}</td>
                        <td data-label="Registered" class="text-light">${c.created_at}</td>
                        <td data-label="Action">
                            <div style="display:flex; gap: 8px; justify-content: flex-end;">
                                <button class="btn btn-amount" style="padding: 6px 12px; font-size: 13px;" onclick="showQR('${escapeHTML(c.id)}', '${escapeHTML(c.name)}')">
                                    <i class='bx bx-qr'></i> View
                                </button>
                                <button class="btn btn-danger-soft" style="padding: 6px 12px; font-size: 13px;" onclick="deleteCustomer('${escapeHTML(c.id)}', '${escapeHTML(c.name)}')">
                                    <i class='bx bx-trash'></i> Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            document.getElementById('customers-table-body').insertAdjacentHTML('beforeend', htmlRows);
            window.customerOffset += data.length;
            window.isLoadingMoreCustomers = false;
            
            if (data.length < 10) {
                window.hasMoreCustomers = false;
                sentinel.style.opacity = '1';
                sentinel.innerHTML = "<span style='font-size: 13px; opacity: 0.7;'>No more customers</span>";
            } else {
                sentinel.style.opacity = '0';
            }
        })
        .catch(err => {
            console.error("Could not load more customers", err);
            window.isLoadingMoreCustomers = false;
            sentinel.style.opacity = '0';
        });
}

function handleIssueQR(e) {
    e.preventDefault();
    const name = document.getElementById('customer-name').value;
    const balance = document.getElementById('initial-balance').value;
    
    fetch(`${API()}/api/customers`, {
        method: 'POST',
        headers : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, initial_balance: balance })
    })
    .then(res => res.json().then(data => ({status: res.status, body: data})))
    .then(res => {
        if(res.status === 201) {
            showToast('Customer created successfully!');
            document.getElementById('issue-qr-form').reset();
            toggleModal('issueQrModal');
            loadCustomers();
            showQR(res.body.id, name);
        } else {
            showToast(res.body.error, 'error');
        }
    });
}

function showQR(id, name) {
    document.getElementById('qr-customer-name').innerText = name;
    document.getElementById('qr-customer-id').innerText = id;
    // QR image is served by the remote Flask server
    document.getElementById('qr-image').src = `${API()}/qrcode/${id}.png`;
    toggleModal('viewQrModal');
}

function handleRecharge(e) {
    e.preventDefault();
    const customer_id = document.getElementById('recharge-customer-id').value;
    const amount = document.getElementById('recharge-amount').value;
    
    fetch(`${API()}/api/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: customer_id, amount: amount })
    })
    .then(res => res.json().then(data => ({status: res.status, body: data})))
    .then(res => {
        if(res.status === 200) {
            showToast(`Recharge successful! New balance: ${formatCurrency(res.body.new_balance)}`);
            document.getElementById('recharge-form').reset();
        } else {
            showToast(res.body.error, 'error');
        }
    })
    .catch(err => {
        showToast('System Error', 'error');
    });
}

function handleAssignExistingQR(e) {
    e.preventDefault();
    const qr_id = document.getElementById('assign-qr-id').value;
    const name = document.getElementById('assign-customer-name').value;
    const balance = document.getElementById('assign-initial-balance').value;
    
    fetch(`${API()}/api/customers`, {
        method: 'POST',
        headers : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, initial_balance: balance, qr_id: qr_id })
    })
    .then(res => res.json().then(data => ({status: res.status, body: data})))
    .then(res => {
        if(res.status === 201 || res.status === 200) {
            showToast('Existing QR assigned successfully!');
            document.getElementById('assign-qr-form').reset();
            closeAssignQRFlow();
            loadCustomers();
        } else {
            showToast(res.body.error, 'error');
        }
    });
}

function deleteCustomer(id, name) {
    if(confirm(`Are you sure you want to permanently delete customer "${name}"?\nThis action cannot be undone and will permanently wipe their transaction history.`)) {
        fetch(`${API()}/api/customers/${id}`, {
            method: 'DELETE'
        })
        .then(res => res.json().then(data => ({status: res.status, body: data})))
        .then(res => {
            if(res.status === 200) {
                showToast(`Customer "${name}" deleted successfully.`, 'success');
                loadCustomers();
            } else {
                showToast(res.body.error, 'error');
            }
        })
        .catch(err => {
            showToast('System Error', 'error');
        });
    }
}

function handleSaveSettings(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> Saving...`;
    
    const data = {
        business_name: document.getElementById('business_name').value.trim(),
        checkin_fee: document.getElementById('checkin_fee').value.trim(),
        currency_symbol: document.getElementById('currency_symbol').value.trim()
    };
    
    fetch(`${API()}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json().then(d => ({status: res.status, body: d})))
    .then(res => {
        btn.innerHTML = originalText;
        if(res.status === 200) {
            // Update localStorage cache immediately
            localStorage.setItem('business_name', data.business_name);
            localStorage.setItem('checkin_fee', data.checkin_fee);
            localStorage.setItem('currency_symbol', data.currency_symbol);
            showToast('Settings saved successfully! Refreshing to apply changes...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } else {
            showToast(res.body.error || 'Failed to save settings', 'error');
        }
    })
    .catch(err => {
        btn.innerHTML = originalText;
        showToast('System Error', 'error');
    });
}

// -------------------------------------------------------
// Dynamic Windows Download Logic (Venuity)
// -------------------------------------------------------

function handleDownloadLatest() {
    const btn = document.getElementById('windows-download-btn');
    const icon = btn.querySelector('i');
    const originalIcon = icon.className;
    
    // Simple loading feedback
    icon.className = 'bx bx-loader-alt bx-spin';
    
    fetch(`${API()}/api/latest_installer`)
        .then(res => {
            if (!res.ok) throw new Error('No installer available');
            return res.json();
        })
        .then(data => {
            if (data.url) {
                // Trigger download
                const link = document.createElement('a');
                link.href = `${API()}${data.url}`;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                showToast(`Downloading Venuity ${data.version}...`);
            }
        })
        .catch(err => {
            console.error(err);
            showToast('Installer not available yet', 'error');
        })
        .finally(() => {
            icon.className = originalIcon;
        });
}

/**
 * Detects if the user is on Windows and visiting via a browser (not Tauri app).
 */
function initDownloadButton() {
    const isWindows = navigator.userAgent.indexOf('Win') !== -1;
    const isTauri = !!window.__TAURI_INTERNALS__;
    const isHomePage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/venuity/frontend/') || window.location.pathname.endsWith('/frontend/');
    
    const downloadBtn = document.getElementById('windows-download-btn');
    if (downloadBtn) {
        if (isWindows && !isTauri && isHomePage) {
            downloadBtn.style.display = 'flex';
        } else {
            downloadBtn.style.display = 'none';
        }
    }
}

// Run on load
document.addEventListener('DOMContentLoaded', initDownloadButton);
