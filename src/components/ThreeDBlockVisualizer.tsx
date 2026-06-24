import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box,
  CircleGauge,
  Cpu,
  Expand,
  Minimize2,
  RadioTower,
  Rotate3d,
  Sparkles,
} from 'lucide-react';
import { Bundle } from '../types';

type ArenaMode = 'ASSEMBLY' | 'AUCTION' | 'LEADERS';

interface ThreeDBlockVisualizerProps {
  currentSlot: number;
  congestionScore: number;
  latestBundles: Bundle[];
}

interface BundleBlock {
  id: string;
  slot: number;
  tipSol: number;
  status: Bundle['status'];
  label: string;
}

const STATUS_COLORS: Record<string, number> = {
  FINALIZED: 0xd4ff00,
  CONFIRMED: 0x06b6d4,
  PROCESSED: 0xf59e0b,
  SUBMITTED: 0x8b5cf6,
  FAILED: 0xf43f5e,
  ABANDONED: 0x71717a,
};

function makeTextSprite(text: string, color = '#d4ff00') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 42px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(10, 10, 11, 0.72)';
  ctx.roundRect(20, 24, 472, 80, 18);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    })
  );
  sprite.scale.set(4.8, 1.2, 1);
  return sprite;
}

function createRing(radius: number, color: number, opacity: number) {
  const geometry = new THREE.TorusGeometry(radius, 0.018, 10, 120);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function createStreamLine(points: THREE.Vector3[], color: number, opacity = 0.85) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

export default function ThreeDBlockVisualizer({
  currentSlot,
  congestionScore,
  latestBundles,
}: ThreeDBlockVisualizerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bundleGroupRef = useRef<THREE.Group | null>(null);
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const animatedMeshesRef = useRef<THREE.Object3D[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const [mode, setMode] = useState<ArenaMode>('ASSEMBLY');
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const blocks = useMemo<BundleBlock[]>(() => {
    const source = latestBundles.length > 0 ? latestBundles.slice(0, 12) : [];
    if (source.length === 0) {
      return Array.from({ length: 8 }, (_, index) => ({
        id: `synthetic-${index}`,
        slot: currentSlot - index,
        tipSol: 0.004 + index * 0.001,
        status: index % 4 === 0 ? 'CONFIRMED' : 'FINALIZED',
        label: `SLOT ${currentSlot - index}`,
      }));
    }

    return source.map((bundle, index) => ({
      id: bundle.id,
      slot: bundle.submissionSlot || currentSlot - index,
      tipSol: bundle.tipLamports / 1_000_000_000,
      status: bundle.status,
      label: bundle.bundleId?.slice(0, 10) || bundle.id.slice(0, 10),
    }));
  }, [currentSlot, latestBundles]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070708, 0.048);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 1000);
    camera.position.set(8, 7, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x070708, 1);
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotateSpeed = 1.15;
    controls.minDistance = 6;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI * 0.48;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0x667080, 1.05));

    const keyLight = new THREE.PointLight(0xd4ff00, 72, 24);
    keyLight.position.set(-4, 6, 4);
    scene.add(keyLight);

    const cyanLight = new THREE.PointLight(0x06b6d4, 48, 20);
    cyanLight.position.set(6, 4, -6);
    scene.add(cyanLight);

    const floor = new THREE.GridHelper(18, 36, 0x334155, 0x1f2937);
    floor.position.y = -1.8;
    scene.add(floor);

    const core = new THREE.Group();
    core.name = 'geyser-core';
    const coreMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 2),
      new THREE.MeshStandardMaterial({
        color: 0xd4ff00,
        emissive: 0x7a9500,
        emissiveIntensity: 1.5,
        metalness: 0.2,
        roughness: 0.25,
        wireframe: true,
      })
    );
    core.add(coreMesh);
    core.add(createRing(1.25, 0xd4ff00, 0.65));
    core.add(createRing(1.9, 0x06b6d4, 0.28));
    core.add(createRing(2.65, 0x8b5cf6, 0.2));
    scene.add(core);
    animatedMeshesRef.current.push(core);

    const leaderPath = new THREE.Group();
    leaderPath.name = 'leader-path';
    for (let index = 0; index < 9; index += 1) {
      const angle = (index / 9) * Math.PI * 2;
      const marker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.34, 8),
        new THREE.MeshStandardMaterial({
          color: index % 3 === 0 ? 0xd4ff00 : 0x334155,
          emissive: index % 3 === 0 ? 0x526300 : 0x000000,
          roughness: 0.45,
        })
      );
      marker.position.set(Math.cos(angle) * 5.4, -1.2, Math.sin(angle) * 5.4);
      marker.rotation.x = Math.PI / 2;
      leaderPath.add(marker);
    }
    scene.add(leaderPath);
    animatedMeshesRef.current.push(leaderPath);

    const bundleGroup = new THREE.Group();
    bundleGroupRef.current = bundleGroup;
    scene.add(bundleGroup);

    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const colorA = new THREE.Color(0xd4ff00);
    const colorB = new THREE.Color(0x06b6d4);
    for (let i = 0; i < particleCount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.2 + Math.random() * 6.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -1.45 + Math.random() * 5.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = Math.random() > 0.58 ? colorA : colorB;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    particleSystemRef.current = particles;
    scene.add(particles);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      controls.autoRotate = autoRotate;
      controls.update();

      core.rotation.y = elapsed * 0.55;
      core.rotation.z = Math.sin(elapsed * 0.6) * 0.12;
      leaderPath.rotation.y = -elapsed * 0.08;

      const particlesRef = particleSystemRef.current;
      if (particlesRef) {
        particlesRef.rotation.y = elapsed * 0.045;
        const attr = particlesRef.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < attr.count; i += 1) {
          const y = attr.getY(i) + 0.012 + congestionScore * 0.018;
          attr.setY(i, y > 4.8 ? -1.6 : y);
        }
        attr.needsUpdate = true;
      }

      bundleGroup.children.forEach((child, index) => {
        child.rotation.y += 0.008 + index * 0.0008;
        child.position.y += Math.sin(elapsed * 1.4 + index) * 0.0025;
      });

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material?.dispose?.();
        }
      });
      mount.removeChild(renderer.domElement);
      animatedMeshesRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetByMode: Record<ArenaMode, { camera: THREE.Vector3; target: THREE.Vector3 }> = {
      ASSEMBLY: { camera: new THREE.Vector3(8, 7, 10), target: new THREE.Vector3(0, 0, 0) },
      AUCTION: { camera: new THREE.Vector3(0, 11, 9), target: new THREE.Vector3(0, 0.2, 0) },
      LEADERS: { camera: new THREE.Vector3(-9, 5, 7), target: new THREE.Vector3(0, -0.6, 0) },
    };

    camera.position.copy(targetByMode[mode].camera);
    controls.target.copy(targetByMode[mode].target);
    controls.update();
  }, [mode]);

  useEffect(() => {
    const group = bundleGroupRef.current;
    if (!group) return;
    group.clear();

    blocks.forEach((block, index) => {
      const angle = (index / Math.max(blocks.length, 1)) * Math.PI * 2;
      const radius = 2.25 + (index % 4) * 0.58;
      const y = -0.72 + Math.floor(index / 4) * 0.82;
      const color = STATUS_COLORS[block.status] ?? 0x94a3b8;
      const size = THREE.MathUtils.clamp(0.42 + block.tipSol * 4.8, 0.42, 1.35);

      const blockRoot = new THREE.Group();
      blockRoot.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 0.72, size),
        new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: block.status === 'FAILED' ? 0.38 : 0.62,
          metalness: 0.4,
          roughness: 0.22,
        })
      );
      blockRoot.add(mesh);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.34 })
      );
      blockRoot.add(outline);

      const halo = createRing(size * 0.9, color, block.status === 'FAILED' ? 0.35 : 0.5);
      halo.position.y = -size * 0.48;
      blockRoot.add(halo);

      if (index < 6) {
        const label = makeTextSprite(`${block.label} / ${block.tipSol.toFixed(4)} SOL`, `#${color.toString(16).padStart(6, '0')}`);
        label.position.y = size * 0.95;
        label.scale.set(2.8, 0.7, 1);
        blockRoot.add(label);
      }

      const stream = createStreamLine(
        [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(blockRoot.position.x * 0.45, blockRoot.position.y + 0.25, blockRoot.position.z * 0.45),
          new THREE.Vector3(blockRoot.position.x, blockRoot.position.y, blockRoot.position.z),
        ],
        color,
        0.44
      );
      group.add(stream);
      group.add(blockRoot);
    });
  }, [blocks]);

  const landed = latestBundles.filter((b) => ['FINALIZED', 'CONFIRMED'].includes(b.status)).length;
  const failed = latestBundles.filter((b) => ['FAILED', 'ABANDONED'].includes(b.status)).length;
  const maxTip = Math.max(...blocks.map((block) => block.tipSol), 0);

  return (
    <section
      className={`bg-[#080809] border border-[#222224] rounded-lg shadow-2xl relative overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-[360px]'
      }`}
      id="three-d-ledger-container"
      aria-label="Three dimensional Jito block engine arena"
    >
      <div ref={mountRef} className="absolute inset-0" />

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-purple-500 via-[#D4FF00] to-cyan-400" />

      <div className="absolute top-4 left-4 right-4 z-10 flex items-start justify-between gap-3 pointer-events-none">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg border border-[#D4FF00]/25 bg-[#D4FF00]/10 flex items-center justify-center">
              <Cpu className="h-4 w-4 text-[#D4FF00]" />
            </span>
            <div>
              <h3 className="text-[11px] font-mono font-black text-white uppercase tracking-wider">
                Jito Block Engine 3D Arena
              </h3>
              <p className="text-[9px] text-[#888888] font-mono uppercase">
                WebGL bundle flow, auction rings, leader path
              </p>
            </div>
          </div>

          <div className="mt-3 hidden sm:flex items-center gap-2 text-[9px] font-mono">
            <span className="px-2 py-1 rounded-md border border-[#D4FF00]/20 bg-[#D4FF00]/10 text-[#D4FF00]">
              {landed} LANDED
            </span>
            <span className="px-2 py-1 rounded-md border border-rose-500/20 bg-rose-500/10 text-rose-300">
              {failed} FAILED
            </span>
            <span className="px-2 py-1 rounded-md border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
              MAX TIP {maxTip.toFixed(4)} SOL
            </span>
          </div>
        </div>

        <div className="flex gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoRotate((value) => !value)}
            className={`p-2 rounded-lg border bg-[#121214]/90 transition-colors cursor-pointer ${
              autoRotate
                ? 'border-[#D4FF00]/30 text-[#D4FF00]'
                : 'border-[#222224] text-zinc-400 hover:text-white'
            }`}
            title="Toggle auto orbit"
          >
            <Rotate3d className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((value) => !value)}
            className="p-2 rounded-lg border border-[#222224] text-zinc-400 hover:text-white bg-[#121214]/90 cursor-pointer"
            title="Toggle fullscreen arena"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="absolute left-4 right-4 bottom-4 z-10 flex flex-col gap-3 pointer-events-none">
        <div className="flex gap-1.5 pointer-events-auto overflow-x-auto">
          {[
            { id: 'ASSEMBLY' as const, label: 'Assembly', icon: Box },
            { id: 'AUCTION' as const, label: 'Auction', icon: CircleGauge },
            { id: 'LEADERS' as const, label: 'Leaders', icon: RadioTower },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-mono font-black uppercase tracking-wider cursor-pointer transition-colors ${
                  mode === item.id
                    ? 'bg-[#D4FF00] border-[#D4FF00] text-black'
                    : 'bg-[#121214]/90 border-[#222224] text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="h-3 w-3" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 text-[8px] font-mono text-[#777777] uppercase">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-[#D4FF00]" />Finalized</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-cyan-400" />Confirmed</span>
            <span className="flex items-center gap-1"><i className="h-1.5 w-1.5 rounded-full bg-rose-500" />Failed</span>
          </div>
          <span className="hidden sm:flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[#D4FF00]" />
            Drag to orbit
          </span>
        </div>
      </div>
    </section>
  );
}
