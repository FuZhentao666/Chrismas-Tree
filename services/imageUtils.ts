// Utility to resize and compress images to prevent GPU memory overload
export const processImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Target size: 1024px max dimension (approx 1MP)
        // This reduces a 12MB photo to ~200KB texture
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        // Draw with smoothing
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'medium'; // Balance quality/speed
            ctx.drawImage(img, 0, 0, width, height);
        }

        // Compress to JPEG 0.75 quality for efficient GPU upload
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      
      img.onerror = () => {
          console.error("Failed to load image");
          resolve(""); // Return empty on fail
      }
    };
  });
};