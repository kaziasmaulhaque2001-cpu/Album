export type CrewRole =
  | 'Lead Photographer'
  | 'Second Photographer'
  | 'Lead Cinematographer'
  | 'Second Cinematographer'
  | 'Drone Operator'
  | 'Editor'
  | 'Assistant';

export type CrewMemberStatus = 'Assigned' | 'Confirmed' | 'Pending' | 'Declined';

export interface CrewMemberAssignment {
  id: string;
  groupKey?: string;
  role: CrewRole;
  name: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  payment: number | string;
  status: CrewMemberStatus;
  notes?: string;
}

export type EventType =
  | 'Aiburo Bhat'
  | 'Mehendi'
  | 'Wedding'
  | 'Biday'
  | 'Boron'
  | 'Reception';

export interface WeddingEventSection {
  id: string;
  eventName: EventType | string;
  eventDate: string; // YYYY-MM-DD
  venue: string;
  googleMapsLink: string;
  notes?: string;
  crewAssignments: CrewMemberAssignment[];
}

export type BookingStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Completed';

export type WeddingSide = 'Bride Side' | 'Groom Side' | 'Both Side';

export interface WeddingCrewBooking {
  id: string;
  weddingSide: WeddingSide;
  event: string;
  eventDate: string;
  venue: string;
  city: string;
  status: BookingStatus;
  notes?: string;
  clientName?: string;
  brideName?: string;
  bridePhone?: string;
  brideFamilyContact?: string;
  groomName?: string;
  groomPhone?: string;
  groomFamilyContact?: string;
  weddingCollection?: string;
  events: WeddingEventSection[];
  createdAt: string;
  updatedAt: string;
}

export type PdfTemplateType = 'template-1' | 'template-2' | 'template-3';

export interface CrewConflict {
  crewName: string;
  phone: string;
  date: string;
  eventTitles: string[];
  bookingIds: string[];
}
