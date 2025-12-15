import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppMode } from '../types';

// Declare JSX elements for R3F
declare global {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      instancedMesh: any;
      sphereGeometry: any;
      meshStandardMaterial: any;
    }
  }
}

// Interface wrapper to handle potential type definition missing
interface InstancedMesh extends THREE.Mesh {
  count: number;
  instanceMatrix: { needsUpdate: boolean };
  setMatrixAt(index: number, matrix: THREE.Matrix4): void;
  getMatrixAt(index: number, matrix: THREE.Matrix4): void;
}

interface TextParticlesProps {
  mode: AppMode;
}

const TextParticles: React.FC<TextParticlesProps> = ({ mode }) => {
  // Use local interface or cast
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate points from text
  const particles = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Draw text
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 120px "Times New Roman", serif'; // Serif for Christmas feel
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DYX & FZT', canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    const points: { initialPos: THREE.Vector3, explodedPos: THREE.Vector3, scale: number }[] = [];
    
    // Sample density
    const step = 4; 
    
    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const index = (y * canvas.width + x) * 4;
        // If pixel is bright enough
        if (data[index] > 100) {
          // Map to 3D space
          // Center the text
          const px = (x - canvas.width / 2) * 0.08;
          const py = -(y - canvas.height / 2) * 0.08;
          const pz = -10; // Push back behind tree

          // Initial position (Formed text)
          const initialPos = new THREE.Vector3(px, py, pz);
          
          // Exploded position (Scattered)
          // Scatter outwards from center
          const angle = Math.random() * Math.PI * 2;
          const radius = 20 + Math.random() * 10;
          const explodedPos = new THREE.Vector3(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
            pz + (Math.random() - 0.5) * 5
          );

          points.push({
            initialPos,
            explodedPos,
            scale: Math.random() * 0.1 + 0.05
          });
        }
      }
    }
    return points;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Movement speed
    const speed = mode === AppMode.TREE ? 2.5 : 1.0;

    particles.forEach((p, i) => {
      // Determine target based on mode
      // TREE -> Formed Text
      // EXPLODED/ZOOM -> Scattered
      let target = p.initialPos;
      
      if (mode !== AppMode.TREE) {
         // Add some noise movement in exploded state
         const time = state.clock.elapsedTime;
         target = p.explodedPos.clone().add(new THREE.Vector3(
             Math.sin(time + i) * 0.5,
             Math.cos(time * 0.8 + i) * 0.5,
             0
         ));
      }

      // Get current instance matrix
      meshRef.current!.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

      // Lerp position
      dummy.position.lerp(target, delta * speed);
      
      // Update Scale (pulse slightly)
      // const scale = p.scale * (1 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.2);
      dummy.scale.setScalar(p.scale);

      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particles.length]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshStandardMaterial 
        color="#ffffff" 
        emissive="#ffffff" 
        emissiveIntensity={0.8}
        toneMapped={false}
      />
    </instancedMesh>
  );
};

export default TextParticles;