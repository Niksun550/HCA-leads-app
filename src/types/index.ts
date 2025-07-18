
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Sales Rep' | 'Viewer' | 'Structure';
export const userRoles: UserRole[] = ['Admin', 'Sales Rep', 'Viewer', 'Structure'];

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

export type MeterType = '1 Phase' | '3 Phase';
export const meterTypes: MeterType[] = ['1 Phase', '3 Phase'];

export type PropertyType = 'Commercial' | 'Residential';
export const propertyTypes: PropertyType[] = ['Commercial', 'Residential'];

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
  meterType: MeterType;
  propertyType: PropertyType;
  visitDates: Timestamp[];
  ownerId: string;
  ownerName: string;
  leadBy: LeadSource;
  status: LeadStatus;
  createdAt: Timestamp;
  remarks: Remark[];
  closedAt?: Timestamp | null;
  structureTeamMemberId?: string | null;
  structureTeamMemberName?: string | null;
}
