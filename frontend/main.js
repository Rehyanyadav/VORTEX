import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// --- CONFIG ---
const SCENE_CONFIG = {
    globeColor: 0x8b5cf6,
    arcColor: 0x22d3ee,
    particleCount: 2000,
    globeRadius: 100,
};

// --- CORE ENGINE ---
let scene, camera, renderer, globe, points, arcs = [];

function initScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 250;

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('bg-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Create Digital Globe
    const geometry = new THREE.SphereGeometry(SCENE_CONFIG.globeRadius, 64, 64);
    const material = new THREE.PointsMaterial({
        color: SCENE_CONFIG.globeColor,
        size: 0.5,
        transparent: true,
        opacity: 0.6
    });

    // Create Point Cloud for Globe
    const pointGeometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 5000; i++) {
        const phi = Math.acos(-1 + (2 * i) / 5000);
        const theta = Math.sqrt(5000 * Math.PI) * phi;
        
        positions.push(
            SCENE_CONFIG.globeRadius * Math.cos(theta) * Math.sin(phi),
            SCENE_CONFIG.globeRadius * Math.sin(theta) * Math.sin(phi),
            SCENE_CONFIG.globeRadius * Math.cos(phi)
        );
    }
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    globe = new THREE.Points(pointGeometry, material);
    scene.add(globe);

    // Add Ambient Glow
    const glowGeometry = new THREE.SphereGeometry(SCENE_CONFIG.globeRadius * 1.05, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: SCENE_CONFIG.globeColor,
        transparent: true,
        opacity: 0.05,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    animate();
}

// --- WARP ARCS SYSTEM ---
function createArc() {
    const startLat = (Math.random() - 0.5) * Math.PI;
    const startLon = (Math.random() - 0.5) * Math.PI * 2;
    const endLat = (Math.random() - 0.5) * Math.PI;
    const endLon = (Math.random() - 0.5) * Math.PI * 2;

    const start = new THREE.Vector3().setFromSphericalCoords(SCENE_CONFIG.globeRadius, startLat, startLon);
    const end = new THREE.Vector3().setFromSphericalCoords(SCENE_CONFIG.globeRadius, endLat, endLon);
    
    // Mid point pulled outward for the arc
    const mid = start.clone().lerp(end, 0.5);
    mid.normalize().multiplyScalar(SCENE_CONFIG.globeRadius * 1.5);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
        color: SCENE_CONFIG.arcColor,
        transparent: true,
        opacity: 0
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);
    
    return { line, progress: 0, speed: 0.01 + Math.random() * 0.02 };
}

function updateArcs() {
    if (Math.random() > 0.95 && arcs.length < 15) {
        arcs.push(createArc());
    }

    for (let i = arcs.length - 1; i >= 0; i--) {
        const arc = arcs[i];
        arc.progress += arc.speed;
        
        if (arc.progress <= 1) {
            // Fade in and out
            arc.line.material.opacity = Math.sin(arc.progress * Math.PI) * 0.5;
        } else {
            scene.remove(arc.line);
            arcs.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    globe.rotation.y += 0.001;
    globe.rotation.x += 0.0005;
    
    updateArcs();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- UI LOGIC ---
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/api';
const shortenBtn = document.getElementById('shorten-btn');
const urlInput = document.getElementById('url-input');
const linksList = document.getElementById('links-list');
const btnLoader = document.getElementById('btn-loader');
const expirySelect = document.getElementById('expiry-select');

// Initial Load
initScene();
loadLinks();

// Auto-check for redirection
if (window.location.hash) {
    handleRedirection(window.location.hash.substring(1));
}

async function handleRedirection(shortCode) {
    const overlay = document.getElementById('redirect-overlay');
    overlay.style.display = 'flex';
    
    try {
        const res = await fetch(`${API_URL}/${shortCode}`);
        const data = await res.json();
        
        if (data.url) {
            window.location.href = data.url;
        } else {
            showToast('Vortex Link Expired or Invalid', 'error');
            overlay.style.display = 'none';
        }
    } catch (err) {
        showToast('Warp Failed', 'error');
        overlay.style.display = 'none';
    }
}

shortenBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) return showToast('Enter a valid URL', 'error');

    shortenBtn.disabled = true;
    btnLoader.style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/shorten`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url, 
                expiresIn: parseInt(expirySelect.value) 
            })
        });
        const data = await res.json();
        
        if (data.shortCode) {
            saveToLocal(data);
            renderLink(data);
            urlInput.value = '';
            showToast('Warp Link Created!');
        }
    } catch (err) {
        showToast('Server connection failed', 'error');
    } finally {
        shortenBtn.disabled = false;
        btnLoader.style.display = 'none';
    }
});

function renderLink(data) {
    const existing = document.querySelector(`[data-code="${data.shortCode}"]`);
    if (existing) existing.remove();

    const card = document.createElement('div');
    card.className = 'link-card';
    card.setAttribute('data-code', data.shortCode);
    const shortUrl = `${window.location.origin}/#${data.shortCode}`;
    
    const jokes = [
        "Pappu: Papa, cycle chahiye. Papa: Padhai par focus karo, cycle par nahi!",
        "Santa: Biwi se jhagda khatam? Banta: Haan, ghutno par chalkar aayi thi. Santa: Kya boli? Banta: Bed ke niche se bahar aao!",
        "Teacher: Sabse bada dushman kaun? Student: Homework!",
        "Patient: Doctor, log mujhe ignore karte hain. Doctor: Next please!",
        "Banta: Aaj maine ek naya business shuru kiya. Santa: Kaunsa? Banta: 'Vortex' bechne ka!"
    ];
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

    card.innerHTML = `
        <div class="link-info">
            <div class="original-url">${data.url}</div>
            <div class="joke-text">✨ ${randomJoke}</div>
            <div class="short-url-container">
                <a href="${shortUrl}" class="short-url" target="_blank">${window.location.host}/#${data.shortCode}</a>
            </div>
            ${data.expiresAt ? `<div class="expiry-label">Expires: ${new Date(data.expiresAt).toLocaleTimeString()}</div>` : ''}
        </div>
        <div class="actions">
            <button class="action-btn" onclick="showQR('${data.shortCode}')" title="QR Code">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            </button>
            <button class="action-btn" onclick="copyToClipboard('${shortUrl}')" title="Copy">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path></svg>
            </button>
            <button class="action-btn delete-btn" onclick="deleteLink('${data.shortCode}')" title="Delete">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
            </button>
        </div>
    `;
    linksList.prepend(card);
}

function saveToLocal(data) {
    let links = JSON.parse(localStorage.getItem('vortex_links') || '[]');
    links = links.filter(l => l.shortCode !== data.shortCode);
    links.push(data);
    localStorage.setItem('vortex_links', JSON.stringify(links));
}

function loadLinks() {
    const links = JSON.parse(localStorage.getItem('vortex_links') || '[]');
    linksList.innerHTML = '';
    links.forEach(renderLink);
}

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
};

window.deleteLink = (code) => {
    let links = JSON.parse(localStorage.getItem('vortex_links') || '[]');
    links = links.filter(l => l.shortCode !== code);
    localStorage.setItem('vortex_links', JSON.stringify(links));
    loadLinks();
    showToast('Link removed from history');
};

window.showQR = (code) => {
    const modal = document.getElementById('qr-modal');
    const container = document.getElementById('qr-canvas-container');
    container.innerHTML = '';
    const url = `${window.location.origin}/#${code}`;
    
    // Using a public QR generator for simplicity
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    qrImg.style.borderRadius = '15px';
    qrImg.style.background = 'white';
    qrImg.style.padding = '10px';
    container.appendChild(qrImg);
    
    modal.style.display = 'flex';
};

document.getElementById('close-qr').onclick = () => {
    document.getElementById('qr-modal').style.display = 'none';
};

function showToast(msg, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    document.getElementById('toast-container').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
