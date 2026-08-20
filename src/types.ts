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
export interface SavedFont {
  id: string;
  name: string;
  url: string; // Blob URL or data URL
  createdAt: number;
  expiresAt?: number;
  source?: string;
  fontFamily?: string;
  googleFont?: boolean;
  styleProfile?: {
    slant: number;
    letterSpacing: number;
    lineHeight: number;
    inkColor: string;
    wobble: number;
    strokeWeight: number;
    irregularity: number;
  };
}

export type AppPhase = 'home' | 'font-creation' | 'text-writer' | 'homework-solver' | 'find-font' | 'ai-humanizer' | 'use-case';

export interface PageConfig {
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  wordSpacing: number;
  letterSpacing: number;
  slant: number;
  thickness: number;
  leftMargin: number;
  topMargin: number;
  inkColor: string;
  naturalRandomness: boolean;
  randomnessIntensity: number;
  inkVariation: boolean;
  inkVariationIntensity: number;
  effect: 'normal' | 'shadow' | 'scanner' | 'saturate';
  pageStyle: 'white' | 'black-lined' | 'paper2' | 'blue-lined' | 'gray-lined' | 'grid' | 'old-paper' | 'note' | 'wishlist' | 'birthday' | 'love-letter' | 'legal-pad' | 'newspaper' | 'graph-paper' | 'kraft' | 'blackboard' | 'project-floral' | 'project-ocean' | 'project-music' | 'project-colorful' | 'project-purple' | 'project-pink';
}

export interface WriterPage {
  id: string;
  content: string;
  images: WriterImage[];
  elements: WriterElement[];
}

export interface WriterImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer: 'above' | 'below';
  rotation?: number;
}

export interface WriterElement {
  id: string;
  type: 'text' | 'heading' | 'emoji';
  content: string;
  x: number;
  y: number;
  fontSize?: number;
  rotation?: number;
  layer: 'above' | 'below';
  width?: number;
  height?: number;
}

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
