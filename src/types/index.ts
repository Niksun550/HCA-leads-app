
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Admin' | 'Sales Rep' | 'Viewer' | 'Structure' | 'Director';
export const userRoles: UserRole[] = ['Admin', 'Sales Rep', 'Viewer', 'Structure', 'Director'];

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  photoURL?: string | null;
}

export type LeadStatus = 'New' | 'Contacted' | 'Visited' | 'Proposal Sent' | 'Structure Pending' | 'Site Visit Done' | 'IN Design' | 'Quotation Send' | 'Closed' | 'Dropped';
export const leadStatuses: LeadStatus[] = ['New', 'Contacted', 'Visited', 'Proposal Sent', 'Structure Pending', 'Site Visit Done', 'IN Design', 'Quotation Send', 'Closed', 'Dropped'];

export const structureLeadStatuses: LeadStatus[] = ['Site Visit Done', 'IN Design', 'Quotation Send', 'Structure Pending'];


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

export interface Attachment {
  name: string;
  url: string;
  type: string;
  uploadedAt: Timestamp;
}

export interface Message {
    id: string;
    text: string;
    authorId: string;
    createdAt: Timestamp;
}

export interface Lead {
  id:string;
  customerName: string;
  mobileNumber: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  kwRequirement?: number;
  meterType: MeterType;
  propertyType: PropertyType;
  visitDates: Timestamp[];
  ownerId: string;
  ownerName: string;
  leadBy: LeadSource;
  status: LeadStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  remarks: Remark[];
  attachments?: Attachment[];
  messages: Message[];
  closedAt?: Timestamp | null;
  structureTeamMemberId?: string | null;
  structureTeamMemberName?: string | null;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: Record<string, string>;
  participantPhotos: Record<string, string | null>;
  lastMessage: Message | null;
  updatedAt: Timestamp;
  unreadCounts: Record<string, number>;
}

export type TaskStatus = 'To Do' | 'In Progress' | 'Done' | 'Cancelled';
export const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Done', 'Cancelled'];

export type TaskPriority = 'High' | 'Medium' | 'Low';
export const taskPriorities: TaskPriority[] = ['High', 'Medium', 'Low'];

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    assigneeId: string;
    assigneeName: string;
    leadId?: string | null;
    leadCustomerName?: string | null;
    createdBy: string;
}
