import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AppMode, ParticleData, PhotoData } from '../types';
import { getTreePosition, getExplodedPosition, randomRange } from '../services/mathUtils';
import { Image } from '@react-three/drei';

interface TreeParticlesProps {
  mode: AppMode;
  userPhotos: string[];
  handPosition: { x: number, y: number };
}

const COUNT = 1200;
const RADIUS_BASE = 6;
const HEIGHT = 14;

// Colors
const COLOR_GREEN = new THREE.Color("#0f4d2a");
const COLOR_GOLD = new THREE.Color("#ffd700");
const COLOR_RED = new THREE.Color("#b01b2e");

const TreeParticles: React.FC<TreeParticlesProps> = ({ mode, userPhotos, handPosition }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { viewport, camera } = useThree();

  // Generate particle data
  const particles = useMemo(() => {
    const temp: ParticleData[] = [];
    for (let i = 0; i < COUNT; i++) {
      const typeRand = Math.random();
      let type: 'sphere' | 'cube' | 'torus' = 'sphere';
      let color = COLOR_GREEN;
      let scale = randomRange(0.05, 0.15);

      if (typeRand > 0.90) {
        type = 'torus';
        color = COLOR_GOLD;
        scale = randomRange(0.15, 0.3);
      } else if (typeRand > 0.80) {
        type = 'cube';
        color = COLOR_RED;
        scale = randomRange(0.1, 0.25);
      } else {
        // Leaves/Needles
        color = Math.random() > 0.5 ? COLOR_GREEN : new THREE.Color("#1a5c35");
      }

      const treePos = getTreePosition(i, COUNT, RADIUS_BASE, HEIGHT);
      const expPos = getExplodedPosition(15);

      temp.push({
        id: i,
        type,
        color: '#' + color.getHexString(),
        initialPos: treePos,
        explodedPos: expPos,
        scale,
        rotationSpeed: [Math.random() * 0.02, Math.random() * 0.02, Math.random() * 0.02]
      });
    }
    return temp;
  }, []);

  // Prepare photos
  const photos = useMemo<PhotoData[]>(() => {
    const list = [...userPhotos];
    // Add placeholders if not enough
    if (list.length < 5) {
      const placeholders = [
         "https://picsum.photos/400/400?random=1",
         "https://picsum.photos/400/600?random=2",
         "https://picsum.photos/600/400?random=3",
         "https://picsum.photos/500/500?random=4",
         "https://picsum.photos/400/400?random=5",
      ];
      list.push(...placeholders.slice(0, 5 - list.length));
    }
    
    return list.map((url, i) => {
        const treePos = getTreePosition(i * (COUNT / list.length) + 100, COUNT, RADIUS_BASE + 0.5, HEIGHT);
        const expPos = getExplodedPosition(12);
        return {
            id: `photo-${i}`,
            url,
            aspectRatio: 1, // Simplified
            initialPos: treePos,
            explodedPos: expPos
        };
    });
  }, [userPhotos]);

  // Temp vectors for animation
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  
  // Animation Loop
  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    // 1. Group Rotation (Hand Control)
    if (mode === AppMode.EXPLODED || mode === AppMode.PHOTO_ZOOM) {
        // Map hand X (0-1) to Rotation Y
        // Hand X is usually 0 (left) to 1 (right)
        // We want 0.5 to be stable.
        const rotationTarget = (handPosition.x - 0.5) * 2 * Math.PI; // +/- PI
        // Smooth rotation
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotationTarget, 0.05);
        
        // Tilt based on Y
        const tiltTarget = (handPosition.y - 0.5) * 0.5;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, tiltTarget, 0.05);
    } else {
        // Auto rotate tree slowly
        groupRef.current.rotation.y += delta * 0.2;
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
    }

    // 2. Particles Animation
    // To make it run efficiently, I will use a ref to store current positions
    // and update them every frame.
    updateParticles(delta);
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

  const updateParticles = (delta: number) => {
      const positions = positionsRef.current;
      const moveSpeed = mode === AppMode.TREE ? 2.5 : 1.5; // Faster to return to tree

      let idx = 0;
      for (let i = 0; i < COUNT; i++) {
        const p = particles[i];
        
        let tx = 0, ty = 0, tz = 0;

        if (mode === AppMode.TREE) {
            tx = p.initialPos[0];
            ty = p.initialPos[1];
            tz = p.initialPos[2];
        } else {
             // Exploded or Zoom
             tx = p.explodedPos[0];
             ty = p.explodedPos[1];
             tz = p.explodedPos[2];
        }

        // Lerp
        const cx = positions[idx];
        const cy = positions[idx + 1];
        const cz = positions[idx + 2];

        const nx = THREE.MathUtils.lerp(cx, tx, delta * moveSpeed);
        const ny = THREE.MathUtils.lerp(cy, ty, delta * moveSpeed);
        const nz = THREE.MathUtils.lerp(cz, tz, delta * moveSpeed);

        positions[idx] = nx;
        positions[idx + 1] = ny;
        positions[idx + 2] = nz;

        // Apply to Instance
        dummy.position.set(nx, ny, nz);
        dummy.scale.setScalar(p.scale);
        
        // Rotate ornaments
        dummy.rotation.x += p.rotationSpeed[0];
        dummy.rotation.y += p.rotationSpeed[1];
        dummy.updateMatrix();

        meshRef.current!.setMatrixAt(i, dummy.matrix);
        // Set color
        meshRef.current!.setColorAt(i, new THREE.Color(p.color));

        idx += 3;
      }
      meshRef.current!.instanceMatrix.needsUpdate = true;
      if (meshRef.current!.instanceColor) meshRef.current!.instanceColor.needsUpdate = true;
  };

  return (
    <group ref={groupRef}>
      <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
        {/* We use a simple sphere for all, or maybe a box. 
            For true variety, we'd need multiple instanced meshes.
            Let's stick to Spheres for the "Glow" look, maybe LowPoly spheres */}
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial 
            toneMapped={false}
            roughness={0.4} 
            metalness={0.6}
            emissiveIntensity={0.5} 
        />
      </instancedMesh>

      {/* Render Photos as individual planes */}
      {photos.map((photo, index) => (
         <PhotoPlane 
            key={photo.id} 
            data={photo} 
            mode={mode} 
            index={index} 
            isZoomTarget={mode === AppMode.PHOTO_ZOOM && index === 0} // Simplification: Always zoom first photo or calculate based on index
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
}

// Sub-component for individual photos to handle their own lerping
const PhotoPlane: React.FC<PhotoPlaneProps> = ({ data, mode, index, isZoomTarget }) => {
    const ref = useRef<THREE.Mesh>(null);
    const posRef = useRef(new THREE.Vector3(...data.initialPos));

    useFrame((state, delta) => {
        if (!ref.current) return;

        let target = new THREE.Vector3();
        let scaleTarget = 1.5;

        if (mode === AppMode.TREE) {
            target.set(...data.initialPos);
            scaleTarget = 1.0;
        } else if (mode === AppMode.EXPLODED) {
            target.set(...data.explodedPos);
            scaleTarget = 1.5;
        } else if (mode === AppMode.PHOTO_ZOOM) {
            if (isZoomTarget) {
                // Move to front of camera
                target.set(0, 0, 6); // Close to camera (camera usually at z=10-15)
                scaleTarget = 5.0;
                // Face camera
                ref.current.lookAt(state.camera.position);
            } else {
                // Push others back / fade
                target.set(...data.explodedPos).multiplyScalar(1.5); // Push further out
                scaleTarget = 1.0;
            }
        }

        // Lerp position
        posRef.current.lerp(target, delta * 3);
        ref.current.position.copy(posRef.current);
        
        // Lerp Scale
        ref.current.scale.lerp(new THREE.Vector3(scaleTarget, scaleTarget, 1), delta * 3);

        // Billboard effect usually, but in tree mode we want them to stick to tree structure?
        // Let's make them always look at camera for visibility
        if (mode !== AppMode.PHOTO_ZOOM || !isZoomTarget) {
            ref.current.lookAt(state.camera.position);
        }
    });

    return (
        <Image 
            ref={ref}
            url={data.url}
            transparent
            opacity={1}
            side={THREE.DoubleSide}
        />
    )
}

export default TreeParticles;