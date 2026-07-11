export const TEAM_LOGO_MAX_DIMENSION = 128;
export const TEAM_LOGO_MAX_BYTES = 32 * 1024;
export const TEAM_LOGO_TOO_BIG_MESSAGE = 'THAT PICTURE IS TOO BIG — TRY A SMALLER ONE';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/webp', 'image/jpeg']);

export function fitTeamLogoDimensions(
  width: number,
  height: number,
  maxDimension = TEAM_LOGO_MAX_DIMENSION,
): { width: number; height: number } {
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('THAT PICTURE COULD NOT BE READ');
  }
  const scale = Math.min(1, maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function assertTeamLogoBlobFits(blob: Pick<Blob, 'size'>): void {
  if (blob.size > TEAM_LOGO_MAX_BYTES) throw new Error(TEAM_LOGO_TOO_BIG_MESSAGE);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('THAT PICTURE COULD NOT BE READ'));
    };
    image.src = url;
  });
}

function encodeCanvas(canvas: HTMLCanvasElement, type: 'image/webp' | 'image/png', quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('THAT PICTURE COULD NOT BE READ'));
    reader.readAsDataURL(blob);
  });
}

export async function resizeTeamLogo(file: File): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('PICK A PNG, WEBP, OR JPG');
  }

  const image = await loadImage(file);
  const dimensions = fitTeamLogoDimensions(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('THAT PICTURE COULD NOT BE READ');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  let smallest: Blob | null = null;
  for (const quality of [0.86, 0.72, 0.58]) {
    const blob = await encodeCanvas(canvas, 'image/webp', quality);
    if (!blob) continue;
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= TEAM_LOGO_MAX_BYTES) return blobToDataUri(blob);
  }
  const png = await encodeCanvas(canvas, 'image/png');
  if (png && (!smallest || png.size < smallest.size)) smallest = png;
  if (!smallest) throw new Error('THAT PICTURE COULD NOT BE READ');
  assertTeamLogoBlobFits(smallest);
  return blobToDataUri(smallest);
}
