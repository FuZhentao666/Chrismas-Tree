import React, { useState, useCallback } from 'react';
import Scene from './components/Scene';
import GestureHandler from './components/GestureHandler';
import UIOverlay from './components/UIOverlay';
import { AppMode, GestureType } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });

  // Handle Gesture Changes
  const handleGestureChange = useCallback((gesture: GestureType, handPos?: { x: number, y: number }) => {
    setCurrentGesture(gesture);
    
    if (handPos) {
        setHandPosition(prev => ({
            x: prev.x * 0.9 + handPos.x * 0.1, // Smooth interpolation
            y: prev.y * 0.9 + handPos.y * 0.1
        }));
    }

    // State Machine Logic based on Gestures
    setMode((prevMode) => {
        if (gesture === GestureType.FIST && prevMode !== AppMode.TREE) {
            return AppMode.TREE;
        }
        if (gesture === GestureType.OPEN_PALM && prevMode === AppMode.TREE) {
            return AppMode.EXPLODED;
        }
        if (gesture === GestureType.PINCH) {
            // Only pinch from exploded or zoom state, not tree
            if (prevMode === AppMode.EXPLODED) {
                return AppMode.PHOTO_ZOOM;
            }
        }
        // If gesture released (NONE or OPEN) while in Zoom, do we stay?
        // Let's say we stay in Zoom until Fist (Tree) or Open Palm (Exploded) is explicitly made again.
        // Actually, let's make Open Palm return to Exploded from Zoom
        if (gesture === GestureType.OPEN_PALM && prevMode === AppMode.PHOTO_ZOOM) {
            return AppMode.EXPLODED;
        }

        return prevMode;
    });
  }, []);

  // Handle File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const newPhotos = Array.from(e.target.files).map((file: File) => URL.createObjectURL(file));
        setUserPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* 3D Scene */}
      <Scene mode={mode} userPhotos={userPhotos} handPosition={handPosition} />
      
      {/* Overlay UI */}
      <UIOverlay 
        mode={mode} 
        currentGesture={currentGesture} 
        onPhotoUpload={handlePhotoUpload} 
      />
      
      {/* Invisible Gesture Handler (contains Video) */}
      <GestureHandler onGestureChange={handleGestureChange} />
    </div>
  );
};

export default App;