export type Role = 'student' | 'coordinator' | 'admin';

export interface UserProfile {
  id: string; // Firebase Auth UID
  fullName: string;
  email: string;
  college?: string;
  roles: Role[];
  profileImage?: string;
  interests?: string[];
  createdAt: number;
}

export interface Club {
  id?: string;
  name: string;
  description: string;
  category: string;
  coverImage?: string;
  logoUrl?: string;
  coordinatorIds: string[]; // Array of User UIDs
  memberCount: number;
  createdAt: number;
}

export interface Membership {
  id?: string;
  userId: string;
  clubId: string;
  joinedAt: number;
}

export interface Event {
  id?: string;
  clubId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  venue: string;
  entryFee: number;
  capacity: number;
  registeredCount: number;
  coverImage?: string;
  createdAt: number;
}

export interface Registration {
  id?: string;
  eventId: string;
  clubId: string;
  userId: string;
  status: 'pending' | 'approved' | 'attended' | 'rejected';
  fee?: number;
  paymentProofUrl?: string;
  qrPayload?: string;
  certificateUrl?: string;
  createdAt: number;
}

export interface Announcement {
  id?: string;
  clubId: string;
  content: string;
  authorId: string;
  imageUrl?: string;
  isPinned: boolean;
  createdAt: number;
}

export interface Notification {
  id?: string;
  userId: string;
  type: 'CLUB_JOINED' | 'EVENT_REGISTERED' | 'REGISTRATION_APPROVED' | 'REGISTRATION_REJECTED' | 'NEW_ANNOUNCEMENT' | 'ROLE_ASSIGNED' | 'CERTIFICATE_AVAILABLE';
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: number;
}
