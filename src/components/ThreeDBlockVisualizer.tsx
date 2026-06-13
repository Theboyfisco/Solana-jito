import React, { useEffect, useRef, useState } from 'react';
import { Rotate3d, Maximize2, Minimize2, Cpu, Sparkles } from 'lucide-react';

interface Point3D {
  x: number;
  y: number;
  z: number;
  color?: string;
  size?: number;
  pulse?: number;
}

interface Block3D {
  id: string;
  slot: number;
  xOffset: number;
  yOffset: number;
  zOffset: number;
  tipSol: number;
  status: 'FINALIZED' | 'CONFIRMED' | 'PROCESSED' | 'FAILED' | 'SUBMITTED';
  scale: number;
}

interface ThreeDBlockVisualizerProps {
  currentSlot: number;
  congestionScore: number;
  latestBundles: any[];
}

export default function ThreeDBlockVisualizer({ currentSlot, congestionScore, latestBundles }: ThreeDBlockVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isRotating, setIsRotating] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rotation angles
  const angleX = useRef<number>(-0.4);
  const angleY = useRef<number>(0.65);
  const isDragging = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stream of particles emitting towards the active 3D blocks
  const particles = useRef<Array<Point3D & { vx: number; vy: number; vz: number; life: number }>>([]);
  
  // Track 3D blocks currently in flight
  const blockQueue = useRef<Block3D[]>([]);

  // Capture updates to slot to populate new blocks and fire burst particle emitters
  useEffect(() => {
    // Generate a fresh 3D block
    const isNewSlot = !blockQueue.current.some(b => b.slot === currentSlot);
    if (isNewSlot) {
      const tipSolResult = latestBundles.length > 0 ? (latestBundles[0].tipLamports / 1000000000) : 0.005;
      const statusResult = latestBundles.length > 0 ? latestBundles[0].status : 'CONFIRMED';
      
      const newBlock: Block3D = {
        id: Math.random().toString(),
        slot: currentSlot,
        xOffset: ((blockQueue.current.length % 3) - 1) * 35,
        yOffset: -Math.floor(blockQueue.current.length / 3) * 28,
        zOffset: (((blockQueue.current.length * 2) % 3) - 1) * 35,
        tipSol: tipSolResult,
        status: statusResult,
        scale: 0.1, // starts small and animates up
      };
      
      blockQueue.current.push(newBlock);

      // Cache max queue size to preserve performance
      if (blockQueue.current.length > 12) {
        blockQueue.current.shift();
      }

      // Generate a burst of particle vectors rising up
      for (let i = 0; i < 35; i++) {
        particles.current.push({
          x: (Math.random() - 0.5) * 40,
          y: 120, // Start down at geyser root
          z: (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -Math.random() * 4 - 2, // Rising up
          vz: (Math.random() - 0.5) * 3.5,
          life: 1.0,
          color: Math.random() > 0.4 ? '#D4FF00' : '#8b5cf6'
        });
      }
    }
  }, [currentSlot, latestBundles]);

  // Main canvas rendering loops with requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Dynamic scaling for high-DPI displays
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      ctx.clearRect(0, 0, width, height);

      // Orbit rotations if autopilot is on
      if (isRotating && !isDragging.current) {
        angleY.current += 0.004;
      }

      const cx = width / 2;
      const cy = height / 2 - 10;
      const fov = 350; // projection field of view

      // Math vectors for coordinates projection rotation
      const cosX = Math.cos(angleX.current);
      const sinX = Math.sin(angleX.current);
      const cosY = Math.cos(angleY.current);
      const sinY = Math.sin(angleY.current);

      // Utility projection function
      const project = (x: number, y: number, z: number) => {
        // Rotate Y Axis
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate X Axis
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Apply perspective division
        const factor = fov / (fov + z2);
        return {
          px: cx + x1 * factor,
          py: cy + y2 * factor,
          depth: z2,
          visible: z2 > -fov,
          scaleFactor: factor
        };
      };

      // 1. Draw glowing background grid floor in 3D
      ctx.strokeStyle = 'rgba(34, 34, 36, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 140;
      const gridSpacing = 28;
      
      for (let i = -gridSize; i <= gridSize; i += gridSpacing) {
        // Draw grid lines along X
        let prev = project(-gridSize, 90, i);
        for (let j = -gridSize + gridSpacing; j <= gridSize; j += gridSpacing) {
          const curr = project(j, 90, i);
          if (prev.visible && curr.visible) {
            ctx.beginPath();
            ctx.moveTo(prev.px, prev.py);
            ctx.lineTo(curr.px, curr.py);
            ctx.stroke();
          }
          prev = curr;
        }

        // Draw grid lines along Z
        prev = project(i, 90, -gridSize);
        for (let j = -gridSize + gridSpacing; j <= gridSize; j += gridSpacing) {
          const curr = project(i, 90, j);
          if (prev.visible && curr.visible) {
            ctx.beginPath();
            ctx.moveTo(prev.px, prev.py);
            ctx.lineTo(curr.px, curr.py);
            ctx.stroke();
          }
          prev = curr;
        }
      }

      // Draw the central Yellowstone Geyser Core in 3D
      const geyserCore = project(0, 95, 0);
      if (geyserCore.visible) {
        const radius = 18 * geyserCore.scaleFactor;
        const gradient = ctx.createRadialGradient(geyserCore.px, geyserCore.py, 0, geyserCore.px, geyserCore.py, radius);
        gradient.addColorStop(0, 'rgba(212, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(212, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(geyserCore.px, geyserCore.py, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#D4FF00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(geyserCore.px, geyserCore.py, radius * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. Render and depth-sort Jito 3D stack blocks
      const itemsToDraw: any[] = [];

      blockQueue.current.forEach((b) => {
        // Slowly ease block scale up
        if (b.scale < 1.0) {
          b.scale += 0.08;
        }

        const size = 10 * b.scale;
        
        // Define eight 3D corners of a voxel block
        const corners = [
          { x: -size, y: -size, z: -size },
          { x: size, y: -size, z: -size },
          { x: size, y: size, z: -size },
          { x: -size, y: size, z: -size },
          { x: -size, y: -size, z: size },
          { x: size, y: -size, z: size },
          { x: size, y: size, z: size },
          { x: -size, y: size, z: size },
        ];

        // Apply offsets
        const projectedCorners = corners.map(c => {
          return project(
            c.x + b.xOffset, 
            c.y + b.yOffset - 15, 
            c.z + b.zOffset
          );
        });

        // Compute average center coordinates & depth for robust painter algorithms
        const blockCenter = project(b.xOffset, b.yOffset - 15, b.zOffset);

        if (blockCenter.visible) {
          itemsToDraw.push({
            type: 'BLOCK',
            depth: blockCenter.depth,
            data: b,
            projectedCorners,
            center: blockCenter,
          });
        }
      });

      // Include active particles in depth collection to draw together cleanly
      particles.current.forEach((p, idx) => {
        const prj = project(p.x, p.y, p.z);
        if (prj.visible) {
          itemsToDraw.push({
            type: 'PARTICLE',
            depth: prj.depth,
            data: p,
            index: idx,
            projected: prj
          });
        }
      });

      // Painter algorithm sorting: back to front (descending depth values)
      itemsToDraw.sort((a, b) => b.depth - a.depth);

      // Render items
      itemsToDraw.forEach((item) => {
        if (item.type === 'PARTICLE') {
          const p = item.data;
          const prj = item.projected;
          const size = Math.max(1, (3 * prj.scaleFactor) * p.life);
          
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life * 0.85;
          ctx.beginPath();
          ctx.arc(prj.px, prj.py, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;

          // Update physics vectors in frame ticks
          p.x += p.vx;
          p.y += p.vy;
          p.z += p.vz;
          p.life -= 0.015; // fade life
          
          // Pull particle slightly towards the newest blocks coordinates
          if (blockQueue.current.length > 0) {
            const targetBlock = blockQueue.current[blockQueue.current.length - 1];
            p.vx += (targetBlock.xOffset - p.x) * 0.01;
            p.vy += (targetBlock.yOffset - p.y - 15) * 0.01;
            p.vz += (targetBlock.zOffset - p.z) * 0.01;
          }
        } 
        
        else if (item.type === 'BLOCK') {
          const b = item.data;
          const pc = item.projectedCorners;
          const center = item.center;

          // Outlines and solid fill definitions based on simulated landing states
          let strokeColor = '#666666';
          let faceColor = 'rgba(34, 34, 36, 0.4)';
          
          if (b.status === 'FINALIZED' || b.status === 'SUCCESS') {
            strokeColor = '#D4FF00';
            faceColor = 'rgba(212, 255, 0, 0.15)';
          } else if (b.status === 'CONFIRMED') {
            strokeColor = '#06b6d4';
            faceColor = 'rgba(6, 182, 212, 0.15)';
          } else if (b.status === 'FAILED') {
            strokeColor = '#f43f5e';
            faceColor = 'rgba(244, 63, 94, 0.18)';
          }

          // Render Cube faces - 6 polygons projection
          const faces = [
            [0, 1, 2, 3], // front
            [1, 5, 6, 2], // right
            [4, 0, 3, 7], // left
            [4, 5, 1, 0], // top
            [3, 2, 6, 7], // bottom
            [5, 4, 7, 6], // back
          ];

          ctx.lineJoin = 'round';

          faces.forEach((face) => {
            ctx.beginPath();
            ctx.moveTo(pc[face[0]].px, pc[face[0]].py);
            for (let i = 1; i < 4; i++) {
              ctx.lineTo(pc[face[i]].px, pc[face[i]].py);
            }
            ctx.closePath();
            
            ctx.fillStyle = faceColor;
            ctx.fill();
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          });

          // Draw floating label text above the newest 3D Jito ledger block 
          if (b.slot === currentSlot) {
            ctx.fillStyle = '#white';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`SLOT ${b.slot}`, center.px, center.py - (18 * center.scaleFactor));
            
            ctx.fillStyle = '#D4FF00';
            ctx.font = '7px monospace';
            ctx.fillText(`${b.tipSol.toFixed(4)} SOL`, center.px, center.py - (11 * center.scaleFactor));
          }
        }
      });

      // Filter dead particles
      particles.current = particles.current.filter(p => p.life > 0);

      // Handle continuous idle sparks in standard loops
      if (Math.random() > 0.8 && particles.current.length < 50) {
        particles.current.push({
          x: (Math.random() - 0.5) * 60,
          y: 90,
          z: (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 2 - 0.5,
          vz: (Math.random() - 0.5) * 1.5,
          life: 0.8 + Math.random() * 0.2,
          color: 'rgba(34, 34, 36, 0.45)'
        });
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isRotating, currentSlot]);

  // Handle Drag & Orbit interaction 
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    // Compute differences
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    angleY.current += deltaX * 0.012;
    angleX.current = Math.max(-1.4, Math.min(1.4, angleX.current + deltaY * 0.012));

    previousMousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-[#121214] border border-[#222224] rounded-[24px] shadow-2xl relative overflow-hidden flex flex-col justify-between transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 bg-[#0a0a0b]/98' : 'h-[235px]'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        isDragging.current = false;
      }}
      id="three-d-ledger-container"
    >
      {/* 3D Decorative mesh stripes */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 via-[#D4FF00] to-transparent opacity-60"></div>
      
      {/* Header controls inside 3D Visualizer overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10 font-mono">
        <div className="flex items-center gap-2">
          <div className="bg-[#D4FF00]/10 p-1.5 rounded border border-[#D4FF00]/25">
            <Cpu className="h-3.5 w-3.5 text-[#D4FF00]" />
          </div>
          <div>
            <div className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1">
              <span>Jito Block Assembler 3D</span>
              <span className="h-1.5 w-1.5 bg-[#D4FF00] rounded-full animate-ping"></span>
            </div>
            <div className="text-[8px] text-[#666666] uppercase">Continuous 3D Block Assembly Floor</div>
          </div>
        </div>

        <div className="flex gap-1.5 pointer-events-auto">
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`p-1.5 rounded-lg border text-zinc-400 hover:text-white bg-[#1e1e21] cursor-pointer transition-colors ${
              isRotating ? 'border-[#D4FF00]/25 text-[#D4FF00]' : 'border-[#222224]'
            }`}
            title="Toggle Auto-Rotation Angle"
          >
            <Rotate3d className="h-3 w-3" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg border border-[#222224] text-zinc-400 hover:text-white bg-[#1e1e21] cursor-pointer"
            title="Toggle Fullscreen Arena"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas element - Handles mouse gestures */}
      <canvas 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing"
      />

      {/* Micro legend overlays inside 3D panel footer */}
      <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center text-[8px] font-mono text-[#666666] pointer-events-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-[#D4FF00] rounded-full"></span>
            <span>SUCCESS</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full"></span>
            <span>CONFIRMED</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-rose-500 rounded-full"></span>
            <span>FAILED</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#D4FF00]" />
          <span>DRAG UNIVERSE TO ORBIT</span>
        </div>
      </div>
    </div>
  );
}
