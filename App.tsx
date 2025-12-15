import React, { useState, useCallback } from 'react';
import Scene from './components/Scene';
import GestureHandler from './components/GestureHandler';
import UIOverlay from './components/UIOverlay';
import { AppMode, GestureType } from './types';
import { processImage } from './services/imageUtils';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [handPosition, setHandPosition] = useState({ x: 0.5, y: 0.5 });
  const [isProcessing, setIsProcessing] = useState(false);

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
        // Return to exploded from zoom
        if (gesture === GestureType.OPEN_PALM && prevMode === AppMode.PHOTO_ZOOM) {
            return AppMode.EXPLODED;
        }

        return prevMode;
    });
  }, []);

  // Handle File Upload with optimization
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        setIsProcessing(true);
        const files = Array.from(e.target.files);
        
        try {
            // Process images in parallel
            const processedImages = await Promise.all(
                files.map(file => processImage(file))
            );
            
            // Filter out any failed loads (empty strings)
            const validImages = processedImages.filter(img => img.length > 0);
            
            setUserPhotos(prev => [...prev, ...validImages]);
        } catch (error) {
            console.error("Error processing photos", error);
        } finally {
            setIsProcessing(false);
        }
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
        isProcessing={isProcessing}
      />
      
      {/* Invisible Gesture Handler (contains Video) */}
      <GestureHandler onGestureChange={handleGestureChange} />
    </div>
  );
};

export default App;