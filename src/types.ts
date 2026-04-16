export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedCharacter {
  char: string;
  boundingBox: BoundingBox;
  confidence: number;
  thickness_variation?: number; // 0-1 score of stroke thickness consistency
  imageData?: string; // Base64 or Blob URL of the cropped image
  svgPath?: string;
}

export interface FontConfig {
  name: string;
  author: string;
  letterSpacing: number;
  fontSize: number;
}

export type AppStep = 1 | 2 | 3 | 4 | 5 | 6;

export const CHARACTERS_TO_DETECT = [
  // Uppercase
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  // Lowercase
  ..."abcdefghijklmnopqrstuvwxyz",
  // Numbers
  ..."0123456789",
  // Punctuation
  ...".!?'\"()-/@#,"
];
