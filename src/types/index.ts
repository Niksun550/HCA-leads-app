
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Sales Rep' | 'Viewer';
export const userRoles: UserRole[] = ['Admin', 'Sales Rep', 'Viewer'];

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
}

export type LeadStatus = 'New' | 'Contacted' | 'Visited' | 'Proposal Sent' | 'Structure Pending' | 'Closed' | 'Dropped';
export const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'Visited', 'Proposal Sent', 'Structure Pending', 'Closed', 'Dropped'];

export type LeadSource = 'Canopy' | 'TPS' | 'Own' | 'Walk-In' | 'Referral';
export const leadSources: LeadSource[] = ['Canopy', 'TPS', 'Own', 'Walk-In', 'Referral'];

export interface Remark {
  text: string;
  createdAt: Timestamp;
  authorName: string;
  authorId: string;
}

export interface Lead {
  id: string;
  customerName: string;
  mobileNumber: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  kwRequirement: number;
  visitDates: Timestamp[];
  ownerId: string;
  ownerName: string;
  leadBy: LeadSource;
  status: LeadStatus;
  createdAt: Timestamp;
  remarks: Remark[];
}
