export enum ClothingType {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  FULL_BODY = 'FULL_BODY'
}

export interface ScrapedProduct {
  id: string;
  url: string;
  title: string;
  imageUrl: string;
  description: string; // Rich extracted text (Fabric, Fit, etc.)
  timestamp: number;
}

export interface UserProfile {
  id: string;
  imageData: string; // Base64
  updatedAt: number;
}

export interface WardrobeState {
  top?: ScrapedProduct;
  bottom?: ScrapedProduct;
}

export interface GenerationRequest {
  userImage: string;
  top?: ScrapedProduct;
  bottom?: ScrapedProduct;
}

// Chrome API Types (Mocking for TS compilation if @types/chrome is missing in environment)
declare global {
  // eslint-disable-next-line no-var
  var chrome: any;
}