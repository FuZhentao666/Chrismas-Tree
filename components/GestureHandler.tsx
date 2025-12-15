import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, DrawingUtils } from '@mediapipe/tasks-vision';
import { GestureType } from '../types';

interface GestureHandlerProps {
  onGestureChange: (gesture: GestureType, handCenter?: { x: number, y: number }) => void;
}

const GestureHandler: React.FC<GestureHandlerProps> = ({ onGestureChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);
  const lastGestureRef = useRef<GestureType>(GestureType.NONE);
  const frameIdRef = useRef<number>(0);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;

    const setupMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
      setLoaded(true);
      startWebcam(handLandmarker);
    };

    setupMediaPipe();

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWebcam = async (landmarker: HandLandmarker) => {
    if (!videoRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener('loadeddata', () => {
        predictWebcam(landmarker);
      });
    } catch (err) {
      console.error("Error accessing webcam:", err);
    }
  };

  const predictWebcam = (landmarker: HandLandmarker) => {
    if (!videoRef.current) return;
    
    // Only detect if video is playing
    if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
      const startTimeMs = performance.now();
      const results = landmarker.detectForVideo(videoRef.current, startTimeMs);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const gesture = detectGesture(landmarks);
        
        // Calculate rough center of hand for rotation controls (normalized 0-1)
        // Wrist is index 0, Middle finger knuckle is index 9
        const palmX = (landmarks[0].x + landmarks[9].x) / 2;
        const palmY = (landmarks[0].y + landmarks[9].y) / 2;

        if (gesture !== lastGestureRef.current) {
          lastGestureRef.current = gesture;
          onGestureChange(gesture, { x: palmX, y: palmY });
        } else if (gesture === GestureType.OPEN_PALM) {
          // Send continuous updates for rotation if palm is open
           onGestureChange(gesture, { x: palmX, y: palmY });
        }
      } else {
        if (lastGestureRef.current !== GestureType.NONE) {
           lastGestureRef.current = GestureType.NONE;
           onGestureChange(GestureType.NONE);
        }
      }
    }
    
    frameIdRef.current = requestAnimationFrame(() => predictWebcam(landmarker));
  };

  const detectGesture = (landmarks: any[]): GestureType => {
    // MediaPipe Hand Landmarks:
    // 0: Wrist
    // 4: Thumb tip
    // 8: Index tip
    // 12: Middle tip
    // 16: Ring tip
    // 20: Pinky tip
    
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const wrist = landmarks[0];

    // Distance helper
    const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

    // 1. Check for Pinch (Thumb and Index close)
    if (dist(thumbTip, indexTip) < 0.05) {
      return GestureType.PINCH;
    }

    // 2. Check for Fist (Fingertips close to wrist/palm base)
    // A simple heuristic: are tips below the PIP joints? Or just close to wrist?
    // Let's use distance to wrist. If all 4 fingers (excluding thumb) are close to wrist.
    const fingerTips = [indexTip, middleTip, ringTip, pinkyTip];
    const avgDistToWrist = fingerTips.reduce((acc, tip) => acc + dist(tip, wrist), 0) / 4;
    
    if (avgDistToWrist < 0.25) { // Threshold depends on hand distance to camera, but 0.2 is usually "curled"
      return GestureType.FIST;
    }

    // 3. Check for Open Palm (Fingers extended)
    // If tips are far from wrist and spread out
    if (avgDistToWrist > 0.35) {
      return GestureType.OPEN_PALM;
    }

    return GestureType.NONE;
  };

  return (
    <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-gold-500/50 shadow-lg z-50 bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover opacity-80 transform scale-x-[-1]" // Mirror effect
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-xs text-center p-1">
          Loading AI...
        </div>
      )}
    </div>
  );
};

export default GestureHandler;