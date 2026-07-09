import * as THREE from "three";

/**
 * Engine vortex — a ring of particles that spins up with scroll,
 * standing in for the 9,000 rpm flat-six. Additive points, no
 * post-processing, so it stays cheap on integrated GPUs.
 */
export function createEngineScene(canvas, { lowPower = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.25 : 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0.6, 7.5);
  camera.lookAt(0, 0, 0);

  const COUNT = lowPower ? 3500 : 9000;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT * 4); // radius, angle, y-jitter, speed

  for (let i = 0; i < COUNT; i++) {
    const radius = 2.2 + Math.pow(Math.random(), 1.6) * 2.6;
    const angle = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * (0.25 + (radius - 2.2) * 0.5);
    seeds.set([radius, angle, y, 0.35 + Math.random() * 0.85], i * 4);
    positions.set([Math.cos(angle) * radius, y, Math.sin(angle) * radius], i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uSize: { value: lowPower ? 9.0 : 12.0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uSize;
      varying float vGlow;
      void main() {
        vec3 p = position;
        float r = length(p.xz);
        float baseAngle = atan(p.z, p.x);
        // inner particles orbit faster — a gearbox of rings
        float speed = (0.15 + uIntensity * 2.2) * (3.2 / r);
        float angle = baseAngle + uTime * speed;
        p.x = cos(angle) * r;
        p.z = sin(angle) * r;
        p.y += sin(uTime * 1.5 + r * 4.0) * 0.05 * uIntensity;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float twinkle = 0.75 + 0.25 * sin(uTime * 3.0 + baseAngle * 20.0);
        gl_PointSize = uSize * twinkle * (6.0 / -mv.z);
        vGlow = smoothstep(4.8, 2.2, r) * (0.35 + uIntensity * 0.65);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vGlow;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, d);
        // silver core → guards red as glow rises
        vec3 silver = vec3(0.92, 0.91, 0.90);
        vec3 red = vec3(1.0, 0.13, 0.20);
        vec3 color = mix(silver, red, vGlow);
        gl_FragColor = vec4(color, alpha * (0.22 + vGlow * 0.7));
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.rotation.x = 0.42;
  scene.add(points);

  let intensity = 0;
  let running = true;
  const clock = new THREE.Clock();

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  renderer.setAnimationLoop(() => {
    if (!running) return;
    material.uniforms.uTime.value = clock.getElapsedTime();
    material.uniforms.uIntensity.value += (intensity - material.uniforms.uIntensity.value) * 0.05;
    points.rotation.y += 0.0008 + material.uniforms.uIntensity.value * 0.004;
    renderer.render(scene, camera);
  });

  return {
    setIntensity(v) { intensity = v; },
    pause() { running = false; },
    resume() { running = true; clock.getDelta(); },
  };
}
