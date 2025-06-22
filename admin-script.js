// Admin credentials
const ADMIN_CREDENTIALS = {
    username: 'jhow',
    password: 'morder'
};

// Site data storage
let siteData = {
    mainDownload: {
        title: "HAX STORE v1.0",
        url: "https://example.com/download",
        image: "https://via.placeholder.com/100x100/0066ff/ffffff?text=HAX"
    },
    additionalLinks: []
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    setupEventListeners();
    
    // Check if user is already logged in
    if (isLoggedIn()) {
        showAdminPanel();
    }
});

// Event listeners setup
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Main download form
    const mainDownloadForm = document.getElementById('mainDownloadForm');
    if (mainDownloadForm) {
        mainDownloadForm.addEventListener('submit', handleMainDownloadUpdate);
    }

    // Add link form
    const addLinkForm = document.getElementById('addLinkForm');
    if (addLinkForm) {
        addLinkForm.addEventListener('submit', handleAddLink);
    }
}

// Authentication functions
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem('haxstore_admin_logged_in', 'true');
        localStorage.setItem('haxstore_admin_login_time', Date.now().toString());
        showAdminPanel();
        showNotification('Login realizado com sucesso!', 'success');
    } else {
        errorDiv.textContent = 'Usuário ou senha incorretos!';
        errorDiv.style.display = 'block';
        showNotification('Credenciais inválidas!', 'error');
    }
}

function isLoggedIn() {
    const loggedIn = localStorage.getItem('haxstore_admin_logged_in');
    const loginTime = localStorage.getItem('haxstore_admin_login_time');
    
    if (!loggedIn || !loginTime) return false;
    
    // Session expires after 24 hours
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const currentTime = Date.now();
    
    if (currentTime - parseInt(loginTime) > sessionDuration) {
        logout();
        return false;
    }
    
    return loggedIn === 'true';
}

function logout() {
    localStorage.removeItem('haxstore_admin_logged_in');
    localStorage.removeItem('haxstore_admin_login_time');
    showLoginForm();
    showNotification('Logout realizado com sucesso!', 'success');
}

function showAdminPanel() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAdminData();
}

function showLoginForm() {
    document.getElementById('loginContainer').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

// Data management functions
function loadSavedData() {
    try {
        const savedMainDownload = localStorage.getItem('haxstore_main_download');
        const savedAdditionalLinks = localStorage.getItem('haxstore_additional_links');
        
        if (savedMainDownload) {
            const parsed = JSON.parse(savedMainDownload);
            if (parsed && typeof parsed === 'object') {
                siteData.mainDownload = { ...siteData.mainDownload, ...parsed };
            }
        }
        
        if (savedAdditionalLinks) {
            const parsed = JSON.parse(savedAdditionalLinks);
            if (Array.isArray(parsed)) {
                siteData.additionalLinks = parsed;
            }
        }
    } catch (error) {
        console.warn('Erro ao carregar dados salvos:', error);
        showNotification('Erro ao carregar dados salvos', 'error');
    }
}

function saveMainDownload() {
    localStorage.setItem('haxstore_main_download', JSON.stringify(siteData.mainDownload));
    updateLastModified();
}

function saveAdditionalLinks() {
    localStorage.setItem('haxstore_additional_links', JSON.stringify(siteData.additionalLinks));
    updateLastModified();
}

function updateLastModified() {
    localStorage.setItem('haxstore_last_update', new Date().toLocaleString('pt-BR'));
}

// Load admin data into forms
function loadAdminData() {
    // Load main download data
    document.getElementById('mainTitle').value = siteData.mainDownload.title;
    document.getElementById('mainUrl').value = siteData.mainDownload.url;
    document.getElementById('mainImage').value = siteData.mainDownload.image || '';
    
    // Load additional links
    loadAdminLinks();
    
    // Update statistics
    updateStatistics();
}

// Main download form handler
function handleMainDownloadUpdate(e) {
    e.preventDefault();
    
    const title = document.getElementById('mainTitle').value.trim();
    const url = document.getElementById('mainUrl').value.trim();
    const image = document.getElementById('mainImage').value.trim();
    
    // Validation
    if (!title) {
        showNotification('Título é obrigatório!', 'error');
        return;
    }
    
    if (!url) {
        showNotification('URL é obrigatória!', 'error');
        return;
    }
    
    try {
        new URL(url);
    } catch {
        showNotification('URL inválida! Use formato: https://exemplo.com', 'error');
        return;
    }
    
    siteData.mainDownload = {
        title: title,
        url: url,
        image: image || siteData.mainDownload.image
    };
    
    saveMainDownload();
    showNotification('Download principal atualizado com sucesso!', 'success');
    updateStatistics();
}

// Add link form handler
function handleAddLink(e) {
    e.preventDefault();
    
    const title = document.getElementById('linkTitle').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const image = document.getElementById('linkImage').value.trim();
    
    // Validation
    if (!title) {
        showNotification('Título é obrigatório!', 'error');
        return;
    }
    
    if (!url) {
        showNotification('URL é obrigatória!', 'error');
        return;
    }
    
    try {
        new URL(url);
    } catch {
        showNotification('URL inválida! Use formato: https://exemplo.com', 'error');
        return;
    }
    
    const newLink = {
        id: Date.now(),
        title: title,
        url: url,
        image: image || 'https://via.placeholder.com/60x60/0066ff/ffffff?text=' + title.charAt(0).toUpperCase()
    };
    
    siteData.additionalLinks.push(newLink);
    saveAdditionalLinks();
    
    // Clear form
    document.getElementById('addLinkForm').reset();
    
    // Reload links
    loadAdminLinks();
    updateStatistics();
    
    showNotification('Link adicionado com sucesso!', 'success');
}

// Load links in admin panel
function loadAdminLinks() {
    const container = document.getElementById('adminLinksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (siteData.additionalLinks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #888; padding: 2rem;">
                <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                Nenhum link adicional cadastrado
            </div>
        `;
        return;
    }
    
    siteData.additionalLinks.forEach(link => {
        const linkElement = createAdminLinkElement(link);
        container.appendChild(linkElement);
    });
}

// Create admin link element
function createAdminLinkElement(link) {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'admin-link-item';
    linkDiv.innerHTML = `
        <img src="${link.image}" alt="${link.title}" onerror="this.src='https://via.placeholder.com/50x50/0066ff/ffffff?text=L'">
        <div class="admin-link-info">
            <h4>${link.title}</h4>
            <p>${link.url}</p>
        </div>
        <button class="btn-delete" onclick="deleteLink(${link.id})">
            <i class="fas fa-trash"></i> Excluir
        </button>
    `;
    return linkDiv;
}

// Delete link function
function deleteLink(linkId) {
    if (confirm('Tem certeza que deseja excluir este link?')) {
        const originalLength = siteData.additionalLinks.length;
        siteData.additionalLinks = siteData.additionalLinks.filter(link => link.id !== linkId);
        
        if (siteData.additionalLinks.length < originalLength) {
            saveAdditionalLinks();
            loadAdminLinks();
            updateStatistics();
            showNotification('Link excluído com sucesso!', 'success');
        } else {
            showNotification('Erro ao excluir link!', 'error');
        }
    }
}

// Update statistics
function updateStatistics() {
    const totalLinksElement = document.getElementById('totalLinks');
    const lastUpdateElement = document.getElementById('lastUpdate');
    
    if (totalLinksElement) {
        totalLinksElement.textContent = siteData.additionalLinks.length + 1; // +1 for main download
    }
    
    if (lastUpdateElement) {
        const lastUpdate = localStorage.getItem('haxstore_last_update');
        lastUpdateElement.textContent = lastUpdate || 'Nunca';
    }
}

// Notification system
function showNotification(message, type = 'success') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Utility functions for main site integration
window.getHaxStoreData = function() {
    return {
        mainDownload: siteData.mainDownload,
        additionalLinks: siteData.additionalLinks
    };
};

window.updateHaxStoreData = function(newData) {
    if (newData.mainDownload) {
        siteData.mainDownload = newData.mainDownload;
        saveMainDownload();
    }
    
    if (newData.additionalLinks) {
        siteData.additionalLinks = newData.additionalLinks;
        saveAdditionalLinks();
    }
};

// Auto-save functionality
setInterval(() => {
    if (isLoggedIn()) {
        // Auto-save current form data
        const mainTitle = document.getElementById('mainTitle');
        const mainUrl = document.getElementById('mainUrl');
        const mainImage = document.getElementById('mainImage');
        
        if (mainTitle && mainUrl && mainTitle.value && mainUrl.value) {
            const autoSaveData = {
                title: mainTitle.value,
                url: mainUrl.value,
                image: mainImage.value
            };
            localStorage.setItem('haxstore_auto_save', JSON.stringify(autoSaveData));
        }
    }
}, 30000); // Auto-save every 30 seconds

// Load auto-saved data when forms are focused
document.addEventListener('focus', function(e) {
    if (e.target.tagName === 'INPUT' && e.target.form && e.target.form.id === 'mainDownloadForm') {
        const autoSaveData = localStorage.getItem('haxstore_auto_save');
        if (autoSaveData) {
            const data = JSON.parse(autoSaveData);
            if (document.getElementById('mainTitle').value === siteData.mainDownload.title) {
                // Only load if form hasn't been modified
                document.getElementById('mainTitle').value = data.title;
                document.getElementById('mainUrl').value = data.url;
                document.getElementById('mainImage').value = data.image;
            }
        }
    }
}, true);