export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'studio_admin' | 'ADMIN' | 'EDITOR' | string;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface Album {
  id: string;
  brideName: string;
  groomName: string;
  weddingDate: string;
  eventName: string;
  coverUrl?: string;
  description?: string;
  password?: string;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
  photoCount?: number;
}

export interface Photo {
  id: string;
  albumId: string;
  folderId?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  filename: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  isSelected?: boolean;
}

export interface Folder {
  id: string;
  albumId: string;
  name: string;
  side: 'BRIDE' | 'GROOM' | 'GENERAL';
  coverUrl?: string | null;
  order: number;
  createdAt: string;
  updatedAt?: string;
  totalPhotos?: number;
  selectedPhotosCount?: number;
}

export interface Settings {
  businessName: string;
  logoUrl?: string;
  watermarkText?: string;
  contactEmail?: string;
  contactPhone?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  theme: 'light' | 'dark';
}

export * from './types/proofing.js';


