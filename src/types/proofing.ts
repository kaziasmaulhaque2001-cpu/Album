export type ProofingSide = 'BRIDE' | 'GROOM';

export type ProofingStatus =
  | 'Design Started'
  | 'Waiting Client'
  | 'Correction Pending'
  | 'Correction Uploaded'
  | 'Approved'
  | 'Print Ready'
  | 'Delivered';

export type PageType =
  | 'front_cover'
  | 'inside_cover'
  | 'spread'
  | 'inside_back_cover'
  | 'back_cover';

export type SpreadType =
  | 'FRONT_COVER'
  | 'INSIDE_COVER'
  | 'SPREAD'
  | 'LAST_INSIDE_COVER'
  | 'BACK_COVER'
  | PageType;

export interface AlbumSpread {
  id: string;
  pageType: PageType;
  type?: SpreadType;
  displayOrder?: number;
  spreadNumber?: number; // Order index for SPREAD types (1, 2, 3...)
  title: string; // e.g. "Front Cover", "Spread 01", "Back Cover"
  filename?: string;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  size?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProofingVersion {
  id: string;
  versionNumber: number; // 1, 2, 3...
  side: ProofingSide;
  title: string;
  status: ProofingStatus;
  spreads: AlbumSpread[];
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ProofingComment {
  id: string;
  albumId: string;
  spreadId: string;
  spreadNumber?: number;
  spreadTitle?: string;
  side: ProofingSide;
  versionNumber: number;
  author: string;
  authorRole: 'Client' | 'Designer' | 'Admin';
  text: string;
  pinX?: number; // 0 to 100 percentage
  pinY?: number; // 0 to 100 percentage
  attachmentUrl?: string;
  status: 'Pending' | 'Resolved';
  designerReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface ProofingActivity {
  id: string;
  albumId: string;
  side: ProofingSide;
  type: 'Upload' | 'Replace' | 'Publish' | 'Comment' | 'Correction' | 'Approve' | 'StatusChange' | 'Delete' | 'Restore' | 'Reorder' | 'View' | 'Favorite';
  description: string;
  user: string;
  createdAt: string;
}

export interface ProofingSettings {
  watermarkText?: string;
  enableWatermark?: boolean;
  allowComments?: boolean;
  downloadEnabled?: boolean;
  autoApproveDays?: number;
}

export interface ProofingApprovalState {
  side: ProofingSide;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  clientSignature?: string;
}

export interface AlbumProofingData {
  albumId: string;
  brideStatus: ProofingStatus;
  groomStatus: ProofingStatus;
  activeBrideVersionId?: string;
  activeGroomVersionId?: string;
  versions: ProofingVersion[];
  comments: ProofingComment[];
  activities: ProofingActivity[];
  approvals: ProofingApprovalState[];
  settings: ProofingSettings;
}
