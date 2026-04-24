/**
 * squat3d.js — Iridescent holographic GLB figure
 * Laryssa Fernandes PT · Training in Motion section
 */

(function () {
  'use strict';

  /* ──────── CONFIG ──────── */
  const MODEL_PATH   = 'assets/models/model.glb';
  const CANVAS_ID    = 'squat-canvas';

  const PALETTE = [
    [0.733, 0.427, 0.341],   
    [0.847, 0.659, 0.608], 
    [0.937, 0.702, 0.624],   
    [0.914, 0.839, 0.812],   
    [1.000, 0.980, 0.960], 
  ];

  /* ─────────── VERTEX SHADER ──────────────────── */
  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;
    uniform float uTime;

    void main() {
      vNormal   = normalize(normalMatrix * normal);
      vec4 wp   = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      vViewDir  = normalize(cameraPosition - wp.xyz);

      // subtle vertex pulse / breath
      float pulse = sin(uTime * 1.4 + position.y * 3.0) * 0.004;
      vec3 pos    = position + normal * pulse;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  /* ─────────────── FRAGMENT SHADER ────────────────────── */
  const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vWorldPos;

    uniform float uTime;
    uniform vec3  uColor0;
    uniform vec3  uColor1;
    uniform vec3  uColor2;
    uniform vec3  uColor3;
    uniform vec3  uColorHi;

    /* fresnel rim factor */
    float fresnel(vec3 n, vec3 v, float power) {
      return pow(1.0 - clamp(dot(n, v), 0.0, 1.0), power);
    }

    /* smooth-step colour ramp across 5 stops */
    vec3 palette(float t) {
      t = clamp(t, 0.0, 1.0);
      if (t < 0.25) return mix(uColor0, uColor1, t / 0.25);
      if (t < 0.50) return mix(uColor1, uColor2, (t - 0.25) / 0.25);
      if (t < 0.75) return mix(uColor2, uColor3, (t - 0.50) / 0.25);
                    return mix(uColor3, uColorHi,  (t - 0.75) / 0.25);
    }

    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(vViewDir);

      /* iridescent colour shift — angle + time + Y position */
      float ndotv   = dot(n, v);
      float shift   = ndotv + vWorldPos.y * 0.35 + uTime * 0.25;
      shift         = 0.5 + 0.5 * sin(shift * 3.141592);

      /* second layer offset for colour richness */
      float shift2  = ndotv + vWorldPos.y * 0.2  + uTime * 0.18 + 1.57;
      shift2        = 0.5 + 0.5 * sin(shift2 * 3.141592);

      vec3 col      = mix(palette(shift), palette(shift2), 0.45);

      /* rim / fresnel glow */
      float rim     = fresnel(n, v, 2.8);
      col           = mix(col, uColorHi, rim * 0.5);

      /* specular highlight */
      vec3  lightDir = normalize(vec3(0.6, 1.0, 0.8));
      float spec     = pow(max(dot(reflect(-lightDir, n), v), 0.0), 32.0);
      col           += uColorHi * spec * 0.35;

      /* scanline grid (subtle) */
      float scanY = sin(vWorldPos.y * 80.0 + uTime * 2.0) * 0.5 + 0.5;
      float scanX = sin(vWorldPos.x * 60.0) * 0.5 + 0.5;
      float grid  = scanY * scanX;
      col        += uColorHi * grid * 0.04;

      /* translucent holographic alpha — opaque core, glowing rim */
      float alpha = mix(0.82, 1.0, rim * 0.6 + spec * 0.4);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  /* ──────────────── MAIN INIT ─────────────────── */
  function init() {
    const canvas = document.getElementById(CANVAS_ID);
    if (!canvas) return;

    const wrap   = canvas.parentElement;
    const W      = wrap.clientWidth  || 480;
    const H      = wrap.clientHeight || 520;

    /* Renderer */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;

    /* Scene & camera */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(0, 1.1, 3.6);
    camera.lookAt(0, 0.9, 0);

   
    const ambLight  = new THREE.AmbientLight(0xfff0eb, 1.0);
    const dirLight  = new THREE.DirectionalLight(0xfff0eb, 1.2);
    dirLight.position.set(1.5, 3, 2);
    scene.add(ambLight, dirLight);

    /* Iridescent shader material */
    const iriMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime:    { value: 0 },
        uColor0:  { value: new THREE.Vector3(...PALETTE[0]) },
        uColor1:  { value: new THREE.Vector3(...PALETTE[1]) },
        uColor2:  { value: new THREE.Vector3(...PALETTE[2]) },
        uColor3:  { value: new THREE.Vector3(...PALETTE[3]) },
        uColorHi: { value: new THREE.Vector3(...PALETTE[4]) },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });

    /* Load GLB */
    let model   = null;
    let autoRot = 0;

    const loader = new THREE.GLTFLoader();
    loader.load(
      MODEL_PATH,
      (gltf) => {
        model = gltf.scene;

        /* Apply iridescent material to every mesh */
        model.traverse((child) => {
          if (child.isMesh) {
            child.material = iriMaterial;
            child.castShadow    = false;
            child.receiveShadow = false;
          }
        });

        /* Auto-centre + fit model */
        const box    = new THREE.Box3().setFromObject(model);
        const centre = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale  = 2.2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(centre.multiplyScalar(scale));

        scene.add(model);

        /* Hide loading indicator if present */
        const loader3d = wrap.querySelector('.squat3d-loader');
        if (loader3d) loader3d.style.display = 'none';
      },
      undefined,
      (err) => {
        console.warn('[squat3d] GLB load error:', err);
        /* Gracefully fall back — leave SVG scene visible */
        canvas.style.display = 'none';
      }
    );

    /* ─── Particle system (floating sparks) ──────────────────── */
    const sparkGeo = new THREE.BufferGeometry();
    const SPARK_COUNT = 80;
    const sparkPos  = new Float32Array(SPARK_COUNT * 3);
    const sparkSeed = new Float32Array(SPARK_COUNT);
    for (let i = 0; i < SPARK_COUNT; i++) {
      sparkPos[i * 3]     = (Math.random() - 0.5) * 3.0;
      sparkPos[i * 3 + 1] = Math.random() * 3.5;
      sparkPos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      sparkSeed[i]         = Math.random() * Math.PI * 2;
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    sparkGeo.setAttribute('seed',     new THREE.BufferAttribute(sparkSeed, 1));

    const sparkMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float seed;
        uniform float uTime;
        void main() {
          vec3 p = position;
          p.y = mod(p.y + uTime * 0.18 + seed, 3.5);
          p.x += sin(uTime * 0.7 + seed * 5.0) * 0.06;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = 2.5 + 1.5 * sin(seed + uTime);
        }
      `,
      fragmentShader: `
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(1.0, 0.82, 0.76, (0.5 - d) * 1.6);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.position.set(0, -0.5, 0);
    scene.add(sparks);

    /* ───────────── Ground ring ─────────────────── */
    const ringGeo = new THREE.RingGeometry(0.55, 0.60, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd8a89b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.08;
    scene.add(ring);

    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.755, 64),
      new THREE.MeshBasicMaterial({
        color: 0xbb6d57, side: THREE.DoubleSide,
        transparent: true, opacity: 0.25,
      })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = -1.08;
    scene.add(ring2);

    /* ──────────── Mouse parallax ──────────────────── */
    let mouseX = 0, mouseY = 0;
    let targetRotY = 0, targetRotX = 0;
    let currentRotY = 0, currentRotX = 0;

    wrap.addEventListener('mousemove', (e) => {
      const r = wrap.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      mouseY = ((e.clientY - r.top)  / r.height - 0.5) * 2;
    });
    wrap.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

    /* ───────────────── Animate ──────────────────────── */
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      /* Update uniforms */
      iriMaterial.uniforms.uTime.value = elapsed;
      sparkMat.uniforms.uTime.value    = elapsed;

      /* Ground rings pulse */
      const pulse = 1 + Math.sin(elapsed * 2.0) * 0.04;
      ring.scale.setScalar(pulse);
      ring2.scale.setScalar(1 + Math.sin(elapsed * 2.0 + 0.5) * 0.055);
      ring.material.opacity  = 0.3 + Math.sin(elapsed * 1.8) * 0.15;
      ring2.material.opacity = 0.15 + Math.sin(elapsed * 1.8 + 0.6) * 0.08;

      /* Model auto-rotation + mouse tilt */
      if (model) {
        autoRot = elapsed * 0.35; // slow auto spin

        targetRotY = mouseX * 0.45 + autoRot;
        targetRotX = mouseY * -0.25;

        currentRotY += (targetRotY - currentRotY) * 0.05;
        currentRotX += (targetRotX - currentRotX) * 0.05;

        model.rotation.y = currentRotY;
        model.rotation.x = currentRotX;

        /* Gentle float */
        model.position.y = Math.sin(elapsed * 0.9) * 0.06;
      }

      renderer.render(scene, camera);
    }

    animate();

    /* ───────────────── Resize ───────────────── */
    const resizeObserver = new ResizeObserver(() => {
      const nW = wrap.clientWidth;
      const nH = wrap.clientHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    });
    resizeObserver.observe(wrap);
  }

  /* ────────────── Bootstrap after DOM ──────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();