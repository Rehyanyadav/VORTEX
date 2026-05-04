import * as THREE from 'three';

export function initScene() {
    const canvas = document.querySelector('#bg-canvas');
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Vortex Particles
    const particlesCount = 5000;
    const posArray = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);
    
    const color1 = new THREE.Color('#8b5cf6'); // Violet
    const color2 = new THREE.Color('#06b6d4'); // Cyan

    for (let i = 0; i < particlesCount; i++) {
        const radius = Math.random() * 20;
        const spin = radius * 0.8;
        const angle = Math.random() * Math.PI * 2 + spin;
        
        posArray[i * 3] = Math.cos(angle) * radius;
        posArray[i * 3 + 1] = (Math.random() - 0.5) * 2;
        posArray[i * 3 + 2] = Math.sin(angle) * radius;

        // Color based on radius
        const mix = radius / 20;
        const mixedColor = color1.clone().lerp(color2, mix);
        colors[i * 3] = mixedColor.r;
        colors[i * 3 + 1] = mixedColor.g;
        colors[i * 3 + 2] = mixedColor.b;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });

    const vortexMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(vortexMesh);

    // Floating Ring
    const torusGeometry = new THREE.TorusGeometry(5, 0.01, 16, 100);
    const torusMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.1 });
    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.rotation.x = Math.PI / 2;
    scene.add(torus);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth - 0.5);
        mouseY = (event.clientY / window.innerHeight - 0.5);
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        vortexMesh.rotation.y += 0.002;
        vortexMesh.rotation.z += 0.001;

        // Interactive tilt
        vortexMesh.rotation.x += (mouseY * 0.1 - vortexMesh.rotation.x) * 0.05;
        vortexMesh.rotation.y += (mouseX * 0.1 - vortexMesh.rotation.y) * 0.05;

        renderer.render(scene, camera);
    }

    animate();
}
