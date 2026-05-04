import { initScene } from './src/scene.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://vortex-2w7w.vercel.app';
const urlInput = document.getElementById('url-input');
const shortenBtn = document.getElementById('shorten-btn');
const linksList = document.getElementById('links-list');
const btnLoader = document.getElementById('btn-loader');
const btnText = document.querySelector('.btn-text');

// Handle redirection if hash exists
async function handleRedirection() {
    const hash = window.location.hash.substring(1);
    if (hash && hash.length === 6) {
        const overlay = document.getElementById('redirect-overlay');
        const main = document.getElementById('main-container');
        
        overlay.style.display = 'flex';
        main.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE}/shorten/${hash}`);
            if (response.ok) {
                const data = await response.json();
                // Delay slightly for effect
                setTimeout(() => {
                    window.location.href = data.url;
                }, 1500);
            } else {
                overlay.style.display = 'none';
                main.style.display = 'block';
                window.location.hash = '';
                showToast('Short code not found', true);
            }
        } catch (error) {
            overlay.style.display = 'none';
            main.style.display = 'block';
            console.error('Redirection error:', error);
        }
    }
}

// Fetch all stats (in a real app, we'd probably have a user account, 
// but for this simple one, we'll just store created ones in localStorage to show them)
function getMyLinks() {
    return JSON.parse(localStorage.getItem('my_buzzy_links') || '[]');
}

function saveLink(link) {
    const links = getMyLinks();
    links.unshift(link);
    localStorage.setItem('my_buzzy_links', JSON.stringify(links));
}

function removeLinkFromLocal(shortCode) {
    const links = getMyLinks().filter(l => l.shortCode !== shortCode);
    localStorage.setItem('my_buzzy_links', JSON.stringify(links));
}

async function renderLinks() {
    const links = getMyLinks();
    linksList.innerHTML = '';
    
    if (links.length === 0) {
        linksList.innerHTML = '<p style="text-align:center; color: var(--text-dim);">No links shortened yet. Start buzzying!</p>';
        return;
    }

    for (const link of links) {
        // Fetch fresh stats for each link
        let freshData = link;
        try {
            const res = await fetch(`${API_BASE}/shorten/${link.shortCode}/stats`);
            if (res.ok) freshData = await res.json();
        } catch (e) { console.error(e); }

        const card = document.createElement('div');
        card.className = 'link-card';
        const shortUrl = `${window.location.origin}/#${freshData.shortCode}`;
        
        card.innerHTML = `
            <div class="link-info">
                <div class="original-url">${freshData.url}</div>
                <div class="short-url-container">
                    <a href="${shortUrl}" class="short-url" target="_blank">${window.location.host}/#${freshData.shortCode}</a>
                    <span class="stats-badge">${freshData.accessCount || 0} hits</span>
                </div>
            </div>
            <div class="actions">
                <button class="action-btn" onclick="copyToClipboard('${shortUrl}')" title="Copy Vortex Link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                </button>
                <button class="action-btn" onclick="editLink('${freshData.shortCode}', '${freshData.url}')" title="Update URL">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="action-btn delete-btn" onclick="deleteLink('${freshData.shortCode}')" title="Destroy Link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        linksList.appendChild(card);
    }
}

async function shortenUrl() {
    const url = urlInput.value.trim();
    if (!url) return;

    setLoading(true);
    try {
        const response = await fetch(`${API_BASE}/shorten`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (response.ok) {
            const data = await response.json();
            saveLink(data);
            urlInput.value = '';
            renderLinks();
            showToast('Vortex link generated!');
        } else {
            const err = await response.json();
            showToast(err.errors ? err.errors[0].msg : (err.error || 'Failed to shorten URL'), true);
        }
    } catch (error) {
        console.error('Error shortening URL:', error);
        showToast('Vortex engine is offline', true);
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        shortenBtn.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        shortenBtn.disabled = false;
    }
}

// Global functions for inline event handlers
window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!');
};

window.editLink = async (shortCode, currentUrl) => {
    const newUrl = prompt('Enter the new destination URL:', currentUrl);
    if (!newUrl || newUrl === currentUrl) return;

    try {
        const response = await fetch(`${API_BASE}/shorten/${shortCode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: newUrl })
        });

        if (response.ok) {
            const data = await response.json();
            // Update local storage
            const links = getMyLinks().map(l => l.shortCode === shortCode ? data : l);
            localStorage.setItem('my_buzzy_links', JSON.stringify(links));
            renderLinks();
            showToast('Link updated successfully');
        } else {
            const err = await response.json();
            showToast(err.errors ? err.errors[0].msg : (err.error || 'Update failed'), true);
        }
    } catch (e) {
        console.error(e);
        showToast('Update failed', true);
    }
};

window.deleteLink = async (shortCode) => {
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/shorten/${shortCode}`, {
            method: 'DELETE'
        });
        if (response.ok || response.status === 404) {
            removeLinkFromLocal(shortCode);
            renderLinks();
            showToast('Link deleted successfully');
        }
    } catch (e) {
        console.error(e);
        showToast('Failed to delete link', true);
    }
};

function showToast(message, isError = false) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


shortenBtn.addEventListener('click', shortenUrl);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') shortenUrl();
});

// Initialization
initScene();
handleRedirection();
renderLinks();

// Auto refresh stats every 30 seconds
setInterval(renderLinks, 30000);
