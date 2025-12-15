import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { Environment, OrbitControls, Stars } from '@react-three/drei';
import TreeParticles from './TreeParticles';
import TextParticles from './TextParticles';
import { AppMode } from '../types';

// Fix for missing R3F intrinsic elements types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      ambientLight: any;
      pointLight: any;
      spotLight: any;
    }
  }
}

interface SceneProps {
  mode: AppMode;
  userPhotos: string[];
  handPosition: { x: number, y: number };
}

const Scene: React.FC<SceneProps> = ({ mode, userPhotos, handPosition }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 18], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: false, toneMappingExposure: 1.5 }}
    >
      <color attach="background" args={['#020202']} />
      
      <Suspense fallback={null}>
        <Environment preset="city" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} color="#0f4d2a" />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffd700" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#b01b2e" />
        <spotLight 
            position={[0, 20, 0]} 
            angle={0.5} 
            penumbra={1} 
            intensity={2} 
            castShadow 
            color="#ffeebb"
        />

        <TreeParticles mode={mode} userPhotos={userPhotos} handPosition={handPosition} />
        <TextParticles mode={mode} />

        {/* Post Processing for Cinematic Feel */}
        <EffectComposer enableNormalPass={false}>
          <Bloom 
            luminanceThreshold={0.4} 
            mipmapBlur 
            intensity={1.5} 
            radius={0.6}
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </EffectComposer>

        {/* Mouse controls for fallback if hand not detected/working well */}
        <OrbitControls 
            enableZoom={mode !== AppMode.TREE} 
            enablePan={false} 
            enableRotate={mode !== AppMode.TREE}
            autoRotate={mode === AppMode.TREE}
            autoRotateSpeed={0.5}
        />
      </Suspense>
    </Canvas>
  );
};

export default Scene;