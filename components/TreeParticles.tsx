import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Vector3, Object3D, MathUtils, DoubleSide, Mesh, Matrix4 } from 'three';
import { AppMode, ParticleData, PhotoData } from '../types';
import { getTreePosition, getExplodedPosition, randomRange } from '../services/mathUtils';
import { Image } from '@react-three/drei';

// Fix for missing types if 'three' definitions are incomplete in the environment
type Group = Object3D;
interface InstancedMesh extends Mesh {
  count: number;
  instanceMatrix: { needsUpdate: boolean };
  instanceColor: { needsUpdate: boolean } | null;
  setMatrixAt(index: number, matrix: Matrix4): void;
  setColorAt(index: number, color: Color): void;
}

// Fix for missing R3F intrinsic elements types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      instancedMesh: any;
      sphereGeometry: any;
      icosahedronGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      instancedMesh: any;
      sphereGeometry: any;
      icosahedronGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

interface TreeParticlesProps {
  mode: AppMode;
  userPhotos: string[];
  handPosition: { x: number, y: number };
}

const COUNT = 1500; // Increased count for dense particle look
const PHOTO_COUNT = 16; // Target number of photos (10-20 range)
const RADIUS_BASE = 6;
const HEIGHT = 14;

// Modern "Cyber Christmas" Palette
const COLOR_NEON_GREEN = new Color("#00ff88");
const COLOR_CYBER_GOLD = new Color("#ffd700");
const COLOR_HOT_RED = new Color("#ff0055");
const COLOR_ICE_WHITE = new Color("#e0ffff");

// Helper to generate safe placeholder images
const generatePlaceholder = (index: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
      // Create a nice gradient
      const grad = ctx.createLinearGradient(0, 0, 512, 512);
      grad.addColorStop(0, `hsl(${index * 70 % 360}, 50%, 20%)`);
      grad.addColorStop(1, `hsl(${(index * 70 + 40) % 360}, 50%, 10%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);
      
      // Border
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 15;
      ctx.strokeRect(0, 0, 512, 512);

      // Inner Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 5;
      ctx.strokeRect(30, 30, 452, 452);

      // Text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = 'bold 60px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD', 256, 220);
      ctx.fillText('MEMORY', 256, 290);
  }
  return canvas.toDataURL('image/jpeg', 0.8);
};

const TreeParticles: React.FC<TreeParticlesProps> = ({ mode, userPhotos, handPosition }) => {
  const meshRef = useRef<InstancedMesh>(null);
  const groupRef = useRef<Group>(null);
  const { viewport, camera } = useThree();

  // Track the photo closest to center (for hover effect)
  const [closestPhotoIndex, setClosestPhotoIndex] = useState<number>(0);
  
  // The actual photo we are zooming into
  const [activeZoomIndex, setActiveZoomIndex] = useState<number>(0);
  
  // Track visited photos to ensure we cycle through them all
  const visitedRef = useRef<Set<number>>(new Set());

  // Handle Zoom Selection Logic
  useEffect(() => {
    // Only trigger when entering Zoom Mode
    if (mode === AppMode.PHOTO_ZOOM) {
       // Logic handled in the Random Selection Effect below
    }
  }, [mode]);

  // Generate particle data
  const particles = useMemo(() => {
    const temp: ParticleData[] = [];
    for (let i = 0; i < COUNT; i++) {
      const typeRand = Math.random();
      let type: 'sphere' | 'cube' | 'torus' = 'sphere';
      let color = COLOR_NEON_GREEN;
      let scale = randomRange(0.02, 0.08); // Smaller, more delicate particles

      if (typeRand > 0.95) {
        // Rare large ornaments
        type = 'torus';
        color = COLOR_CYBER_GOLD;
        scale = randomRange(0.1, 0.2);
      } else if (typeRand > 0.85) {
        // Red accents
        type = 'cube';
        color = COLOR_HOT_RED;
        scale = randomRange(0.08, 0.15);
      } else if (typeRand > 0.70) {
        // White sparkles
        color = COLOR_ICE_WHITE;
        scale = randomRange(0.03, 0.09);
      } else {
        // Base structure
        color = Math.random() > 0.3 ? COLOR_NEON_GREEN : new Color("#00cc6a");
      }

      const treePos = getTreePosition(i, COUNT, RADIUS_BASE, HEIGHT);
      const expPos = getExplodedPosition(12); // Slightly tighter spread

      temp.push({
        id: i,
        type,
        color: '#' + color.getHexString(),
        initialPos: treePos,
        explodedPos: expPos,
        scale,
        rotationSpeed: [Math.random() * 0.05, Math.random() * 0.05, Math.random() * 0.05]
      });
    }
    return temp;
  }, []);

  // Prepare photos
  const photos = useMemo<PhotoData[]>(() => {
    const list = [...userPhotos];
    
    // Logic: 
    // If no user photos -> fill with Placeholders.
    // If user photos exist -> repeat them to fill the target count.
    // This ensures we have enough photos (10-20) and no "blank" frames.
    
    if (list.length === 0) {
        for (let i = 0; i < PHOTO_COUNT; i++) {
            list.push(generatePlaceholder(i));
        }
    } else {
        // Repeat existing photos to fill the count
        // This ensures the tree looks full even with just 1 or 2 uploaded photos
        while (list.length < PHOTO_COUNT) {
            const nextPhoto = list[list.length % userPhotos.length];
            list.push(nextPhoto);
        }
    }

    // Limit if we somehow have more
    const displayList = list.slice(0, PHOTO_COUNT);
    
    return displayList.map((url, i) => {
        // Distribute photos within the tree volume
        // We use a subset of the particle spiral logic to place photos nicely on the tree surface
        
        // Start slightly up the tree (150) and end before the tip (COUNT-150)
        const startIdx = 150;
        const endIdx = COUNT - 150;
        const step = (endIdx - startIdx) / PHOTO_COUNT;
        const particleIdx = startIdx + (i * step);

        const treePos = getTreePosition(particleIdx, COUNT, RADIUS_BASE + 1.2, HEIGHT);
        const expPos = getExplodedPosition(9); // Photos stay closer to center in exploded mode
        
        return {
            id: `photo-${i}`, // Use index-based ID because URLs might be duplicated
            url,
            aspectRatio: 1, 
            initialPos: treePos,
            explodedPos: expPos
        };
    });
  }, [userPhotos]);

  // Random Selection Effect
  useEffect(() => {
      if (mode === AppMode.PHOTO_ZOOM) {
          const count = photos.length;
          let available: number[] = [];
          
          for(let i=0; i<count; i++) {
              if(!visitedRef.current.has(i)) {
                  available.push(i);
              }
          }

          // If all visited, reset
          if(available.length === 0) {
              visitedRef.current.clear();
              // Refill available
              for(let i=0; i<count; i++) available.push(i);
          }

          // Pick random
          if (available.length > 0) {
              const randomIndex = Math.floor(Math.random() * available.length);
              const selectedPhotoIndex = available[randomIndex];
              
              visitedRef.current.add(selectedPhotoIndex);
              setActiveZoomIndex(selectedPhotoIndex);
          }
      }
  }, [mode, photos]); // Recalculate if mode changes to PHOTO_ZOOM

  // Temp vectors for calculation
  const dummy = useMemo(() => new Object3D(), []);
  const tempVec = useMemo(() => new Vector3(), []);
  
  // Animation Loop
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    // 1. Group Rotation (Hand Control)
    if (mode === AppMode.EXPLODED || mode === AppMode.PHOTO_ZOOM) {
        const rotationTarget = (handPosition.x - 0.5) * 2 * Math.PI; 
        groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, rotationTarget, 0.05);
        
        const tiltTarget = (handPosition.y - 0.5) * 0.5;
        groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, tiltTarget, 0.05);
    } else {
        groupRef.current.rotation.y += delta * 0.2;
        groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
    }

    // 2. Calculate Closest Photo (For Hover Effect ONLY now)
    if (mode === AppMode.EXPLODED) {
      let minDist = Infinity;
      let closestIdx = 0;

      photos.forEach((photo, idx) => {
        // Calculate World Position
        tempVec.set(...photo.explodedPos);
        tempVec.applyMatrix4(groupRef.current!.matrixWorld);
        tempVec.project(state.camera);
        
        const distToCenter = tempVec.lengthSq();
        if (distToCenter < minDist) {
          minDist = distToCenter;
          closestIdx = idx;
        }
      });
      
      if (closestIdx !== closestPhotoIndex) {
        setClosestPhotoIndex(closestIdx);
      }
    }

    // 3. Particles Animation
    updateParticles(delta, state.clock.elapsedTime);
  });

  // Position Cache
  const positionsRef = useRef<Float32Array>(new Float32Array(COUNT * 3));
  const initializedRef = useRef(false);

  // Initialize positions
  if (!initializedRef.current) {
      particles.forEach((p, i) => {
          positionsRef.current[i * 3] = p.initialPos[0];
          positionsRef.current[i * 3 + 1] = p.initialPos[1];
          positionsRef.current[i * 3 + 2] = p.initialPos[2];
      });
      initializedRef.current = true;
  }

  const updateParticles = (delta: number, time: number) => {
      const positions = positionsRef.current;
      const moveSpeed = mode === AppMode.TREE ? 2.0 : 1.2; 

      let idx = 0;
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        
        let tx = 0, ty = 0, tz = 0;

        if (mode === AppMode.TREE) {
            tx = p.initialPos[0];
            ty = p.initialPos[1];
            tz = p.initialPos[2];
        } else {
             tx = p.explodedPos[0];
             ty = p.explodedPos[1];
             tz = p.explodedPos[2];
        }

        // Standard Lerp
        const cx = positions[idx];
        const cy = positions[idx + 1];
        const cz = positions[idx + 2];

        // Add some noise/floatiness in exploded mode
        if (mode !== AppMode.TREE) {
            tx += Math.sin(time + p.id) * 0.05;
            ty += Math.cos(time * 0.8 + p.id) * 0.05;
        }

        const nx = MathUtils.lerp(cx, tx, delta * moveSpeed);
        const ny = MathUtils.lerp(cy, ty, delta * moveSpeed);
        const nz = MathUtils.lerp(cz, tz, delta * moveSpeed);

        positions[idx] = nx;
        positions[idx + 1] = ny;
        positions[idx + 2] = nz;

        // Apply to Instance
        dummy.position.set(nx, ny, nz);
        dummy.scale.setScalar(p.scale);
        
        // Rotate ornaments
        dummy.rotation.x += p.rotationSpeed[0] + time * 0.2;
        dummy.rotation.y += p.rotationSpeed[1] + time * 0.2;
        dummy.updateMatrix();

        meshRef.current!.setMatrixAt(i, dummy.matrix);
        // Set color
        meshRef.current!.setColorAt(i, new Color(p.color));

        idx += 3;
      }
      meshRef.current!.instanceMatrix.needsUpdate = true;
      if (meshRef.current!.instanceColor) meshRef.current!.instanceColor.needsUpdate = true;
  };

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
        {/* Low Poly Crystal / Diamond shape for "Modern Particle" look */}
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial 
            toneMapped={false}
            roughness={0.1} 
            metalness={0.8}
            emissiveIntensity={1.5} // High emissive for Bloom
        />
      </instancedMesh>

      {/* Render Photos as individual planes */}
      {photos.map((photo, index) => (
         <PhotoPlane 
            key={photo.id} 
            data={photo} 
            mode={mode} 
            index={index} 
            isZoomTarget={mode === AppMode.PHOTO_ZOOM ? index === activeZoomIndex : false}
            isHovered={mode === AppMode.EXPLODED && index === closestPhotoIndex}
         /> 
      ))}
    </group>
  );
};

interface PhotoPlaneProps {
    data: PhotoData;
    mode: AppMode;
    index: number;
    isZoomTarget: boolean;
    isHovered: boolean;
}

// Sub-component for individual photos to handle their own lerping
const PhotoPlane: React.FC<PhotoPlaneProps> = ({ data, mode, index, isZoomTarget, isHovered }) => {
    const ref = useRef<Mesh>(null);
    const posRef = useRef(new Vector3(...data.initialPos));

    useFrame((state, delta) => {
        if (!ref.current) return;

        let target = new Vector3();
        let scaleTarget = 1.0;

        if (mode === AppMode.TREE) {
            target.set(...data.initialPos);
            scaleTarget = 0.8;
        } else if (mode === AppMode.EXPLODED) {
            target.set(...data.explodedPos);
            scaleTarget = isHovered ? 1.8 : 1.2; // Pulse up if closest
        } else if (mode === AppMode.PHOTO_ZOOM) {
            if (isZoomTarget) {
                // Move to front of camera
                target.set(0, 0, 7); 
                scaleTarget = 5.0;
                ref.current.lookAt(state.camera.position);
            } else {
                // Push others back / fade
                target.set(...data.explodedPos).multiplyScalar(2); 
                scaleTarget = 0.0; // Hide others
            }
        }

        // Lerp position
        posRef.current.lerp(target, delta * 3);
        ref.current.position.copy(posRef.current);
        
        // Lerp Scale
        const currentScale = ref.current.scale.x;
        const nextScale = MathUtils.lerp(currentScale, scaleTarget, delta * 4);
        ref.current.scale.setScalar(nextScale);

        // Billboard effect
        if (mode !== AppMode.PHOTO_ZOOM || !isZoomTarget) {
            ref.current.lookAt(state.camera.position);
        }
        
        // Add subtle hover bob
        if (isHovered && mode === AppMode.EXPLODED) {
            ref.current.position.y += Math.sin(state.clock.elapsedTime * 4) * 0.05;
        }
    });

    return (
        <Image 
            ref={ref}
            url={data.url}
            transparent
            opacity={1}
            side={DoubleSide}
        />
    )
}

export default TreeParticles;