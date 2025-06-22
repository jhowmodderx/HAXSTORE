// Site data storage
let siteData = {
    mainDownload: {
        title: "HAX STORE v1.0",
        url: "#",
        image: "https://via.placeholder.com/100x100/0066ff/ffffff?text=HAX"
    },
    additionalLinks: []
};

// Load site data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    loadSiteData();
    loadAdditionalLinks();
    initializeAnimations();
});

// Load saved data from localStorage
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
    }
}

// Load main download data
function loadSiteData() {
    const mainDownloadTitle = document.getElementById('mainDownloadTitle');
    const mainDownloadBtn = document.getElementById('mainDownloadBtn');
    const mainDownloadImage = document.getElementById('mainDownloadImage');
    
    if (mainDownloadTitle) {
        mainDownloadTitle.textContent = siteData.mainDownload.title;
    }
    
    if (mainDownloadBtn) {
        mainDownloadBtn.href = siteData.mainDownload.url;
        if (siteData.mainDownload.url === '#' || !siteData.mainDownload.url) {
            mainDownloadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                showNotification('Link não configurado ainda!', 'warning');
            });
        }
    }
    
    if (mainDownloadImage) {
        mainDownloadImage.src = siteData.mainDownload.image;
        mainDownloadImage.onerror = function() {
            this.src = "https://via.placeholder.com/100x100/0066ff/ffffff?text=HAX";
        };
    }
}

// Load additional links
function loadAdditionalLinks() {
    const container = document.getElementById('linksContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    siteData.additionalLinks.forEach(link => {
        const linkElement = createLinkElement(link);
        container.appendChild(linkElement);
    });
}

// Create link element
function createLinkElement(link) {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-item';
    linkDiv.innerHTML = `
        <img src="${link.image}" alt="${link.title}">
        <div class="link-info">
            <h4>${link.title}</h4>
            <p>Download disponível</p>
        </div>
        <a href="${link.url}" class="link-btn" target="_blank">
            <i class="fas fa-download"></i> Download
        </a>
    `;
    return linkDiv;
}

// Modal functions
function openCredits() {
    const modal = document.getElementById('creditsModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCredits() {
    const modal = document.getElementById('creditsModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('creditsModal');
    if (event.target === modal) {
        closeCredits();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeCredits();
    }
});

// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Initialize animations
function initializeAnimations() {
    // Add loading animation to download buttons
    const buttons = document.querySelectorAll('.download-btn, .link-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.href === '#' || !this.href || this.href.endsWith('#')) {
                e.preventDefault();
                showNotification('Link não configurado ainda!', 'warning');
                return;
            }
            
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
            this.style.pointerEvents = 'none';
            
            setTimeout(() => {
                this.innerHTML = originalText;
                this.style.pointerEvents = 'auto';
            }, 2000);
        });
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .link-item, .update-item');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

// Notification system
function showNotification(message, type = 'info') {
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

// Admin functions (for localhost admin panel)
function checkAdminAccess() {
    const isAdmin = localStorage.getItem('haxstore_admin') === 'true';
    return isAdmin;
}

function setAdminAccess(status) {
    localStorage.setItem('haxstore_admin', status.toString());
}

// Admin panel data management
function updateMainDownload(title, url, image) {
    siteData.mainDownload = { title, url, image };
    localStorage.setItem('haxstore_main_download', JSON.stringify(siteData.mainDownload));
    loadSiteData();
}

function addAdditionalLink(title, url, image) {
    const newId = Math.max(...siteData.additionalLinks.map(l => l.id), 0) + 1;
    const newLink = { id: newId, title, url, image };
    siteData.additionalLinks.push(newLink);
    localStorage.setItem('haxstore_additional_links', JSON.stringify(siteData.additionalLinks));
    loadAdditionalLinks();
}

function removeAdditionalLink(id) {
    siteData.additionalLinks = siteData.additionalLinks.filter(link => link.id !== id);
    localStorage.setItem('haxstore_additional_links', JSON.stringify(siteData.additionalLinks));
    loadAdditionalLinks();
}

// Load saved data from localStorage
function loadSavedData() {
    const savedMainDownload = localStorage.getItem('haxstore_main_download');
    const savedAdditionalLinks = localStorage.getItem('haxstore_additional_links');
    
    if (savedMainDownload) {
        siteData.mainDownload = JSON.parse(savedMainDownload);
    }
    
    if (savedAdditionalLinks) {
        siteData.additionalLinks = JSON.parse(savedAdditionalLinks);
    }
}

// Initialize saved data on load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedData();
    loadSiteData();
    loadAdditionalLinks();
});

// Export functions for admin panel
window.haxstoreAdmin = {
    checkAccess: checkAdminAccess,
    setAccess: setAdminAccess,
    updateMainDownload: updateMainDownload,
    addAdditionalLink: addAdditionalLink,
    removeAdditionalLink: removeAdditionalLink,
    getSiteData: () => siteData
};