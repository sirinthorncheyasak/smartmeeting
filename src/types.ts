export type DocumentType = 'inbound' | 'outbound';
export type DocumentDirection = 'in' | 'out';
export type DocumentStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  description?: string;
  documentNumber?: string; // e.g. ทน.6906001 (outbound only)
  direction: DocumentDirection;
  status: DocumentStatus;
  rejectionReason?: string; // Outbound rejection reason
  createdBy: string; // email
  createdByName: string;
  approvedBy?: string; // admin email
  approvedAt?: any; // Timestamp or date string
  createdAt: any; // Timestamp or date string
  updatedAt: any; // Timestamp or date string
}

export interface AuditLog {
  id: string;
  action: string;
  documentId: string;
  actor: string; // email or UID
  timestamp: any;
  metadata?: Record<string, any>;
}

export interface Counter {
  id: string; // Format: YYYYMM
  lastRunningNumber: number;
  updatedAt: any;
}

export interface UserProfile {
  email: string;
  name: string;
  isAdmin: boolean;
}
