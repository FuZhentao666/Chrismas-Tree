import React from 'react';
import { AppMode, GestureType } from '../types';
import { Camera, Upload, Hand, Grip, Grab } from 'lucide-react';

interface UIOverlayProps {
  mode: AppMode;
  currentGesture: GestureType;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ mode, currentGesture, onPhotoUpload }) => {
  const getModeText = () => {
    switch (mode) {
      case AppMode.TREE: return "TREE MODE";
      case AppMode.EXPLODED: return "EXPLODED MODE";
      case AppMode.PHOTO_ZOOM: return "PHOTO ZOOM";
      default: return "";
    }
  };

  const getGestureIcon = () => {
    switch(currentGesture) {
        case GestureType.FIST: return <div className="text-red-500 font-bold flex gap-2 items-center"><Grip size={20}/> FIST DETECTED</div>;
        case GestureType.OPEN_PALM: return <div className="text-green-500 font-bold flex gap-2 items-center"><Hand size={20}/> OPEN PALM DETECTED</div>;
        case GestureType.PINCH: return <div className="text-yellow-500 font-bold flex gap-2 items-center"><Grab size={20}/> PINCH DETECTED</div>;
        default: return <div className="text-gray-500 text-sm">Waiting for hand...</div>;
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-8 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
        <div>
            <h1 className="text-4xl font-serif text-amber-400 tracking-widest drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
            CHRISTMAS MAGIC
            </h1>
            <p className="text-emerald-300 text-sm mt-1 uppercase tracking-widest opacity-80">
            Gesture Controlled Experience
            </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
            <div className="pointer-events-auto">
                <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full cursor-pointer transition backdrop-blur-md border border-white/10">
                    <Upload size={16} />
                    <span className="text-xs font-bold">ADD MEMORY</span>
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        className="hidden" 
                        onChange={onPhotoUpload}
                    />
                </label>
            </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-4">
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white">
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Current Gesture</div>
            {getGestureIcon()}
        </div>
        
        <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white w-64">
            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Instructions</div>
            <ul className="space-y-2 text-sm opacity-90">
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span><strong>Fist:</strong> Close Tree</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span><strong>Open Hand:</strong> Explode</span>
                </li>
                <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                    <span><strong>Pinch:</strong> Grab Photo</span>
                </li>
                 <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span><strong>Move Hand:</strong> Rotate View</span>
                </li>
            </ul>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
         <div className="text-6xl font-black text-white/10 tracking-[0.5em] whitespace-nowrap">
            {getModeText()}
         </div>
      </div>
    </div>
  );
};

export default UIOverlay;