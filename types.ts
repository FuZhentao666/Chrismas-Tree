export enum AppMode {
  TREE = 'TREE',
  EXPLODED = 'EXPLODED',
  PHOTO_ZOOM = 'PHOTO_ZOOM'
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST',
  OPEN_PALM = 'OPEN_PALM',
  PINCH = 'PINCH',
  POINTING = 'POINTING'
}

export interface ParticleData {
  id: number;
  type: 'sphere' | 'cube' | 'torus';
  color: string;
  initialPos: [number, number, number]; // Tree position
  explodedPos: [number, number, number]; // Random position
  scale: number;
  rotationSpeed: [number, number, number];
}

export interface PhotoData {
  id: string;
  url: string;
  aspectRatio: number;
  initialPos: [number, number, number];
  explodedPos: [number, number, number];
}