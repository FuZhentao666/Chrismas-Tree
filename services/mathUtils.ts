import * as THREE from 'three';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

// Generate position on a cone (Christmas Tree shape)
export const getTreePosition = (
  heightIdx: number, 
  totalCount: number, 
  radiusBase: number, 
  maxHeight: number
): [number, number, number] => {
  const y = (heightIdx / totalCount) * maxHeight - (maxHeight / 2); // Center Y
  const progress = heightIdx / totalCount;
  const radius = radiusBase * (1 - progress); // Taper towards top
  
  // Golden Angle for nice distribution
  const angle = heightIdx * 2.39996; 
  
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  // Add slight jitter for natural look
  return [
    x + randomRange(-0.2, 0.2), 
    y, 
    z + randomRange(-0.2, 0.2)
  ];
};

// Generate random position in a sphere (Exploded state)
export const getExplodedPosition = (spread: number): [number, number, number] => {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = Math.pow(Math.random(), 1/3) * spread;

  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  ];
};