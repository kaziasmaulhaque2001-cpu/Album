import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Edit,
  Send,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Shield,
  Download,
  Search,
  Filter,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Layers,
  Copy,
  Loader2,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { authFetch } from "../lib/authUtils.js";
import { useSettings } from "../context/SettingsContext.js";
import {
  WeddingCrewBooking,
  WeddingEventSection,
  CrewMemberAssignment,
  CrewRole,
  CrewMemberStatus,
  BookingStatus,
  WeddingSide,
  EventType,
  PdfTemplateType,
  CrewConflict,
} from "../types/weddingCrew.js";
import { generateCrewAssignmentPdf } from "../utils/weddingCrewPdf.js";

const DEFAULT_EVENT_TYPES: EventType[] = [
  "Aiburo Bhat",
  "Mehendi",
  "Wedding",
  "Biday",
  "Boron",
  "Reception",
];

const CREW_ROLES: CrewRole[] = [
  "Lead Photographer",
  "Second Photographer",
  "Lead Cinematographer",
  "Second Cinematographer",
  "Drone Operator",
  "Editor",
  "Assistant",
];

export interface ConsolidatedFreelancer {
  key: string;
  groupKey: string;
  name: string;
  role: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  notes: string;
  status: string;
  totalPayment: number;
  assignedEvents: WeddingEventSection[];
}

export function getUniqueFreelancersForBooking(booking: Partial<WeddingCrewBooking> | null | undefined): ConsolidatedFreelancer[] {
  if (!booking || !booking.events) return [];

  const map = new Map<string, ConsolidatedFreelancer>();

  booking.events.forEach((evt) => {
    (evt.crewAssignments || []).forEach((crew) => {
      if (!crew.name || !crew.name.trim()) return;
      const cleanContact = (crew.phone || crew.whatsappNumber || "").replace(/[^0-9]/g, "");
      const cleanName = crew.name.trim().toLowerCase();
      const key = crew.groupKey || (cleanContact ? `${cleanName}_${cleanContact}` : cleanName);

      if (!map.has(key)) {
        map.set(key, {
          key,
          groupKey: crew.groupKey || key,
          name: crew.name,
          role: crew.role || "Lead Photographer",
          phone: crew.phone || "",
          whatsappNumber: crew.whatsappNumber || crew.phone || "",
          email: crew.email || "",
          notes: crew.notes || "",
          status: crew.status || "Assigned",
          totalPayment: Number(crew.payment || 0),
          assignedEvents: [evt],
        });
      } else {
        const item = map.get(key)!;
        item.totalPayment += Number(crew.payment || 0);
        if (!item.assignedEvents.some((e) => e.id === evt.id)) {
          item.assignedEvents.push(evt);
        }
      }
    });
  });

  return Array.from(map.values());
}

export default function WeddingCrewManager() {
  const { settings } = useSettings();

  const [bookings, setBookings] = useState<WeddingCrewBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<"bookings" | "calendar" | "conflicts">("bookings");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Booking Modal / Drawer State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Partial<WeddingCrewBooking> | null>(null);

  // Delete Modal State
  const [deleteModalBooking, setDeleteModalBooking] = useState<WeddingCrewBooking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgressMessage, setDeleteProgressMessage] = useState("");
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Selected PDF Template
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<PdfTemplateType>("template-1");

  // Active Calendar Month Navigation
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());

  // PDF Preview / Download Modal
  const [previewPdfAssignment, setPreviewPdfAssignment] = useState<{
    booking: WeddingCrewBooking;
    event: WeddingEventSection;
    crew: CrewMemberAssignment;
  } | null>(null);

  // Fetch all bookings
  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await authFetch("/api/wedding-crew");
      if (!res.ok) throw new Error("Failed to load wedding crew bookings");
      const data = await res.json();
      setBookings(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load bookings");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Compute Conflicts (Double bookings on same date for same crew member)
  const conflicts = useMemo<CrewConflict[]>(() => {
    const map = new Map<string, { crewName: string; phone: string; date: string; eventTitles: string[]; bookingIds: string[] }>();

    bookings.forEach((booking) => {
      booking.events?.forEach((evt) => {
        if (!evt.eventDate) return;

        evt.crewAssignments?.forEach((crew) => {
          if (!crew.name) return;
          // Key by crew name/phone + date
          const cleanPhone = (crew.phone || crew.whatsappNumber || crew.name.toLowerCase()).replace(/\s+/g, "");
          const key = `${cleanPhone}_${evt.eventDate}`;

          const existing = map.get(key) || {
            crewName: crew.name,
            phone: crew.phone || crew.whatsappNumber || "N/A",
            date: evt.eventDate,
            eventTitles: [],
            bookingIds: [],
          };

          const titleStr = `${booking.event || "Wedding Event"} (${booking.weddingSide || "Both Side"}) - ${evt.eventName}`;
          existing.eventTitles.push(titleStr);
          existing.bookingIds.push(booking.id);
          map.set(key, existing);
        });
      });
    });

    const list: CrewConflict[] = [];
    map.forEach((value) => {
      if (value.eventTitles.length > 1) {
        list.push(value);
      }
    });

    return list;
  }, [bookings]);

  // Filtered Bookings List
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (b.event || "").toLowerCase().includes(q) ||
        (b.weddingSide || "").toLowerCase().includes(q) ||
        (b.venue || "").toLowerCase().includes(q) ||
        (b.city || "").toLowerCase().includes(q) ||
        (b.notes || "").toLowerCase().includes(q);

      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  // Handle Save / Create / Edit Booking
  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const side = editingBooking.weddingSide || "Both Side";

    if (!editingBooking.event || !editingBooking.eventDate) {
      alert("Please enter Event and Event Date.");
      return;
    }

    if (side === "Bride Side" && !editingBooking.brideName?.trim()) {
      alert("Bride Name is required for Bride Side.");
      return;
    }

    if (side === "Groom Side" && !editingBooking.groomName?.trim()) {
      alert("Groom Name is required for Groom Side.");
      return;
    }

    if (side === "Both Side") {
      if (!editingBooking.brideName?.trim() || !editingBooking.groomName?.trim()) {
        alert("Both Bride Name and Groom Name are required for Both Side.");
        return;
      }
    }

    try {
      setIsLoading(true);
      const isExisting = !!editingBooking.id;
      const url = isExisting ? `/api/wedding-crew/${editingBooking.id}` : "/api/wedding-crew";
      const method = isExisting ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBooking),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save booking");
      }

      await fetchBookings();
      setIsModalOpen(false);
      setEditingBooking(null);
    } catch (err: any) {
      alert(err.message || "Failed to save booking");
    } finally {
      setIsLoading(false);
    }
  };

  // Open Delete Confirmation Modal
  const handleOpenDeleteModal = (booking: WeddingCrewBooking) => {
    setDeleteModalBooking(booking);
    setDeleteErrorMessage(null);
    setIsDeleting(false);
    setDeleteProgressMessage("");
  };

  // Confirm Delete Booking
  const handleConfirmDeleteBooking = async () => {
    if (!deleteModalBooking) return;

    const targetId = deleteModalBooking.id;
    setIsDeleting(true);
    setDeleteErrorMessage(null);
    setDeleteProgressMessage("Deleting booking, assigned events, crew members, and PDF records...");

    try {
      const res = await authFetch(`/api/wedding-crew/${targetId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status}): Failed to delete booking.`);
      }

      setDeleteProgressMessage("Cleaning up records and refreshing list...");

      // Remove card instantly from state
      setBookings((prev) => prev.filter((b) => b.id !== targetId));

      setDeleteModalBooking(null);
      setIsDeleting(false);

      // Refresh list automatically from backend
      await fetchBookings();
    } catch (err: any) {
      console.error("Delete booking error:", err);
      setDeleteErrorMessage(err.message || "Failed to delete booking.");
      setIsDeleting(false);
    }
  };

  // Duplicate Booking Handler
  const handleDuplicateBooking = async (booking: WeddingCrewBooking) => {
    try {
      setIsLoading(true);

      const duplicatePayload = {
        weddingSide: booking.weddingSide || "Both Side",
        event: booking.event ? `${booking.event} (Copy)` : "Wedding Event (Copy)",
        eventDate: booking.eventDate || new Date().toISOString().split("T")[0],
        venue: booking.venue || "",
        city: booking.city || "",
        notes: booking.notes || "",
        status: "Pending" as BookingStatus,
        clientName: booking.clientName || "",
        brideName: booking.brideName || "",
        bridePhone: booking.bridePhone || "",
        brideFamilyContact: booking.brideFamilyContact || "",
        groomName: booking.groomName || "",
        groomPhone: booking.groomPhone || "",
        groomFamilyContact: booking.groomFamilyContact || "",
        weddingCollection: booking.weddingCollection || "",
        events: (booking.events || []).map((evt) => ({
          ...evt,
          id: `evt-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          crewAssignments: (evt.crewAssignments || []).map((crew) => ({
            ...crew,
            id: `crew-dup-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          })),
        })),
      };

      const res = await authFetch("/api/wedding-crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicatePayload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to duplicate booking.");
      }

      const createdBooking: WeddingCrewBooking = await res.json();

      await fetchBookings();

      alert("Booking duplicated successfully.");

      // Automatically open duplicated booking immediately in Edit Mode
      setEditingBooking(JSON.parse(JSON.stringify(createdBooking)));
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message || "Failed to duplicate booking");
    } finally {
      setIsLoading(false);
    }
  };

  // Consolidated WhatsApp Sender Handler for Freelancer
  const handleSendWhatsAppForFreelancer = (booking: WeddingCrewBooking, freelancer: ConsolidatedFreelancer) => {
    const rawWa = (freelancer.whatsappNumber || freelancer.phone || "").replace(/[^0-9]/g, "");
    if (!rawWa) {
      alert(`Please provide a valid WhatsApp Number for ${freelancer.name}.`);
      return;
    }

    // Auto generate assignment PDF covering ALL assigned events
    const pdfDoc = generateCrewAssignmentPdf({
      booking,
      events: freelancer.assignedEvents,
      crew: {
        name: freelancer.name,
        role: freelancer.role as CrewRole,
        phone: freelancer.phone,
        whatsappNumber: freelancer.whatsappNumber,
        email: freelancer.email,
        notes: freelancer.notes,
        status: freelancer.status as CrewMemberStatus,
        payment: freelancer.totalPayment,
      },
      template: selectedPdfTemplate,
      settings,
    });

    const sanitizeName = freelancer.name.replace(/\s+/g, "_");
    pdfDoc.save(`Assignment_${sanitizeName}_Events.pdf`);

    // Prepare consolidated WhatsApp message listing all assigned events and dates
    const eventSummaryList = freelancer.assignedEvents
      .map((e) => `• ${e.eventName} - Date: ${e.eventDate || "TBD"}${e.venue ? ` (Venue: ${e.venue})` : ""}`)
      .join("\n");

    const msg = `Hello ${freelancer.name},\n\nYou have been assigned for wedding crew duty (${freelancer.role}).\n\nBooking: ${booking.event || "Wedding Assignment"}\nSide: ${booking.weddingSide || "Both Side"}\nCity: ${booking.city || "N/A"}\n\nAssigned Events (${freelancer.assignedEvents.length}):\n${eventSummaryList}\n\nPlease check the attached Assignment PDF covering all your assigned events.`;

    const waUrl = `https://wa.me/${rawWa}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Download Consolidated Assignment PDF Handler
  const handleDownloadPdfForFreelancer = (booking: WeddingCrewBooking, freelancer: ConsolidatedFreelancer) => {
    const pdfDoc = generateCrewAssignmentPdf({
      booking,
      events: freelancer.assignedEvents,
      crew: {
        name: freelancer.name,
        role: freelancer.role as CrewRole,
        phone: freelancer.phone,
        whatsappNumber: freelancer.whatsappNumber,
        email: freelancer.email,
        notes: freelancer.notes,
        status: freelancer.status as CrewMemberStatus,
        payment: freelancer.totalPayment,
      },
      template: selectedPdfTemplate,
      settings,
    });

    const sanitizeName = freelancer.name.replace(/\s+/g, "_");
    pdfDoc.save(`Assignment_${sanitizeName}_Events.pdf`);
  };

  // Modal Handler: Toggle event assignment for a freelancer via checkbox
  const handleToggleFreelancerEvent = (
    freelancerKey: string,
    targetEventId: string,
    checked: boolean
  ) => {
    if (!editingBooking || !editingBooking.events) return;

    const currentFreelancers = getUniqueFreelancersForBooking(editingBooking);
    const existing = currentFreelancers.find((f) => f.key === freelancerKey || f.groupKey === freelancerKey);

    const updatedEvents = editingBooking.events.map((evt) => {
      let crewAssignments = [...(evt.crewAssignments || [])];

      if (evt.id === targetEventId) {
        if (checked) {
          const exists = crewAssignments.some((c) => {
            const cleanContact = (c.phone || c.whatsappNumber || "").replace(/[^0-9]/g, "");
            const cleanName = c.name.trim().toLowerCase();
            const cKey = c.groupKey || (cleanContact ? `${cleanName}_${cleanContact}` : cleanName);
            return cKey === freelancerKey || c.groupKey === freelancerKey;
          });

          if (!exists) {
            crewAssignments.push({
              id: `crew-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              groupKey: existing?.groupKey || freelancerKey,
              name: existing?.name || "Freelancer",
              role: (existing?.role as CrewRole) || "Lead Photographer",
              phone: existing?.phone || "",
              whatsappNumber: existing?.whatsappNumber || "",
              email: existing?.email || "",
              payment: existing ? Math.round(existing.totalPayment / Math.max(1, existing.assignedEvents.length)) : 10000,
              status: (existing?.status as CrewMemberStatus) || "Assigned",
            });
          }
        } else {
          crewAssignments = crewAssignments.filter((c) => {
            const cleanContact = (c.phone || c.whatsappNumber || "").replace(/[^0-9]/g, "");
            const cleanName = c.name.trim().toLowerCase();
            const cKey = c.groupKey || (cleanContact ? `${cleanName}_${cleanContact}` : cleanName);
            return cKey !== freelancerKey && c.groupKey !== freelancerKey;
          });
        }
      }

      return { ...evt, crewAssignments };
    });

    setEditingBooking({ ...editingBooking, events: updatedEvents });
  };

  // Modal Handler: Update field for a consolidated freelancer across all assigned events
  const handleUpdateConsolidatedFreelancer = (
    freelancerKey: string,
    field: keyof CrewMemberAssignment,
    value: any
  ) => {
    if (!editingBooking || !editingBooking.events) return;

    const updatedEvents = editingBooking.events.map((evt) => {
      const crewAssignments = (evt.crewAssignments || []).map((c) => {
        const cleanContact = (c.phone || c.whatsappNumber || "").replace(/[^0-9]/g, "");
        const cleanName = c.name.trim().toLowerCase();
        const cKey = c.groupKey || (cleanContact ? `${cleanName}_${cleanContact}` : cleanName);

        if (cKey === freelancerKey || c.groupKey === freelancerKey) {
          return { ...c, groupKey: c.groupKey || freelancerKey, [field]: value };
        }
        return c;
      });
      return { ...evt, crewAssignments };
    });

    setEditingBooking({ ...editingBooking, events: updatedEvents });
  };

  // Modal Handler: Add brand new freelancer
  const handleAddNewFreelancerToBooking = () => {
    if (!editingBooking || !editingBooking.events || editingBooking.events.length === 0) {
      alert("Please add at least one Event Section first.");
      return;
    }

    const currentCount = getUniqueFreelancersForBooking(editingBooking).length;
    const newName = `Freelancer ${currentCount + 1}`;
    const newGroupKey = `fg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newCrewId = `crew-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const updatedEvents = [...editingBooking.events];
    updatedEvents[0] = {
      ...updatedEvents[0],
      crewAssignments: [
        ...(updatedEvents[0].crewAssignments || []),
        {
          id: newCrewId,
          groupKey: newGroupKey,
          name: newName,
          role: "Lead Photographer",
          phone: "",
          whatsappNumber: "",
          email: "",
          payment: 10000,
          status: "Assigned",
        },
      ],
    };

    setEditingBooking({ ...editingBooking, events: updatedEvents });
  };

  // Modal Handler: Remove freelancer from all events
  const handleRemoveFreelancerFromBooking = (freelancerKey: string) => {
    if (!editingBooking || !editingBooking.events) return;

    const updatedEvents = editingBooking.events.map((evt) => ({
      ...evt,
      crewAssignments: (evt.crewAssignments || []).filter((c) => {
        const cleanContact = (c.phone || c.whatsappNumber || "").replace(/[^0-9]/g, "");
        const cleanName = c.name.trim().toLowerCase();
        const cKey = c.groupKey || (cleanContact ? `${cleanName}_${cleanContact}` : cleanName);
        return cKey !== freelancerKey && c.groupKey !== freelancerKey;
      }),
    }));

    setEditingBooking({ ...editingBooking, events: updatedEvents });
  };

  // Open Modal for New Booking
  const handleOpenCreateModal = () => {
    const nowStamp = Date.now();
    setEditingBooking({
      weddingSide: "Both Side",
      event: "Grand Wedding",
      eventDate: new Date().toISOString().split("T")[0],
      venue: "",
      city: "",
      notes: "",
      status: "Pending",
      brideName: "",
      bridePhone: "",
      brideFamilyContact: "",
      groomName: "",
      groomPhone: "",
      groomFamilyContact: "",
      events: DEFAULT_EVENT_TYPES.slice(0, 3).map((evtName, idx) => ({
        id: `evt-${nowStamp}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        eventName: evtName,
        eventDate: new Date().toISOString().split("T")[0],
        venue: "",
        googleMapsLink: "",
        notes: "",
        crewAssignments: [],
      })),
    });
    setIsModalOpen(true);
  };

  // Add Event Section in Modal
  const handleAddEventSection = (eventName: string) => {
    if (!editingBooking) return;
    const currentEvents = editingBooking.events || [];

    const trimmed = eventName.trim();
    if (!trimmed) return;

    if (currentEvents.some((e) => e.eventName.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Event "${trimmed}" already exists in this booking. Please enter a unique event name.`);
      return;
    }

    const newEvt: WeddingEventSection = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventName: trimmed,
      eventDate: editingBooking.eventDate || new Date().toISOString().split("T")[0],
      venue: editingBooking.venue || "",
      googleMapsLink: "",
      notes: "",
      crewAssignments: [],
    };

    setEditingBooking({
      ...editingBooking,
      events: [...currentEvents, newEvt],
    });
  };

  // Duplicate Event Section in Modal
  const handleDuplicateEventSection = (evtId: string) => {
    if (!editingBooking || !editingBooking.events) return;
    const target = editingBooking.events.find((e) => e.id === evtId);
    if (!target) return;

    let newName = `${target.eventName} (Copy)`;
    let counter = 1;
    while (editingBooking.events.some((e) => e.eventName.toLowerCase() === newName.toLowerCase())) {
      counter++;
      newName = `${target.eventName} (Copy ${counter})`;
    }

    const duplicatedEvt: WeddingEventSection = {
      ...target,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventName: newName,
      crewAssignments: (target.crewAssignments || []).map((crew) => ({
        ...crew,
        id: `crew-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      })),
    };

    setEditingBooking({
      ...editingBooking,
      events: [...editingBooking.events, duplicatedEvt],
    });
  };

  // Remove Event Section
  const handleRemoveEventSection = (evtId: string) => {
    if (!editingBooking) return;
    setEditingBooking({
      ...editingBooking,
      events: (editingBooking.events || []).filter((e) => e.id !== evtId),
    });
  };

  // Add Crew Member to Specific Event
  const handleAddCrewMemberToEvent = (evtId: string) => {
    if (!editingBooking || !editingBooking.events) return;

    const events = editingBooking.events.map((evt) => {
      if (evt.id !== evtId) return evt;

      const currentCrew = evt.crewAssignments || [];
      const newCrewName = `Freelancer ${currentCrew.length + 1}`;

      const newCrew: CrewMemberAssignment = {
        id: `crew-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        groupKey: `fg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        role: "Lead Photographer",
        name: newCrewName,
        phone: "",
        whatsappNumber: "",
        email: "",
        payment: 10000,
        status: "Assigned",
        notes: "",
      };

      return {
        ...evt,
        crewAssignments: [...currentCrew, newCrew],
      };
    });

    setEditingBooking({ ...editingBooking, events });
  };

  // Update Crew Member in Specific Event
  const handleUpdateCrewMemberInEvent = (
    evtId: string,
    crewId: string,
    field: keyof CrewMemberAssignment,
    value: any
  ) => {
    if (!editingBooking || !editingBooking.events) return;

    const events = editingBooking.events.map((evt) => {
      if (evt.id !== evtId) return evt;

      const updatedCrew = (evt.crewAssignments || []).map((c) => {
        if (c.id !== crewId) return c;

        const updated = { ...c, [field]: value };
        if (field === "phone" && (!c.whatsappNumber || c.whatsappNumber === c.phone)) {
          updated.whatsappNumber = String(value).replace(/[^0-9]/g, "");
        }
        return updated;
      });

      return { ...evt, crewAssignments: updatedCrew };
    });

    setEditingBooking({ ...editingBooking, events });
  };

  // Remove Crew Member from Specific Event
  const handleRemoveCrewMemberFromEvent = (evtId: string, crewId: string) => {
    if (!editingBooking || !editingBooking.events) return;

    const events = editingBooking.events.map((evt) => {
      if (evt.id !== evtId) return evt;
      return {
        ...evt,
        crewAssignments: (evt.crewAssignments || []).filter((c) => c.id !== crewId),
      };
    });

    setEditingBooking({ ...editingBooking, events });
  };

  // Calendar Helpers
  const daysInMonth = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: ({ dateStr: string; dayNum: number; isCurrentMonth: boolean })[] = [];

    // Prepend previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push({ dateStr: "", dayNum: 0, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    return days;
  }, [currentCalendarDate]);

  const calendarEventsMap = useMemo(() => {
    const map = new Map<string, { booking: WeddingCrewBooking; event: WeddingEventSection }[]>();

    bookings.forEach((booking) => {
      booking.events?.forEach((evt) => {
        if (!evt.eventDate) return;
        const existing = map.get(evt.eventDate) || [];
        existing.push({ booking, event: evt });
        map.set(evt.eventDate, existing);
      });
    });

    return map;
  }, [bookings]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-stone-900 animate-fade-in" id="wedding-crew-module-root">
      {/* Header Bar */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="p-2 text-stone-500 hover:text-stone-900 rounded-lg transition-colors cursor-pointer border border-stone-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl border border-amber-300 bg-amber-50 flex items-center justify-center text-amber-700 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-serif font-bold text-base text-stone-900 leading-tight">
                  👥 Wedding Crew
                </h1>
                <span className="font-mono text-[10px] tracking-wider text-amber-700 uppercase block">
                  Freelance Photography & Cinematography Manager
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Template Selector */}
            <div className="hidden sm:flex items-center gap-2 bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
              <span className="text-stone-500 font-mono text-[10px] uppercase px-1">PDF Template:</span>
              <button
                onClick={() => setSelectedPdfTemplate("template-1")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedPdfTemplate === "template-1"
                    ? "bg-stone-900 text-white font-medium shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Modern Elegant
              </button>
              <button
                onClick={() => setSelectedPdfTemplate("template-2")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedPdfTemplate === "template-2"
                    ? "bg-stone-900 text-white font-medium shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Minimal Slate
              </button>
              <button
                onClick={() => setSelectedPdfTemplate("template-3")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  selectedPdfTemplate === "template-3"
                    ? "bg-stone-900 text-white font-medium shadow-sm"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Luxury Gold
              </button>
            </div>

            <button
              onClick={handleOpenCreateModal}
              className="py-2 px-4 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Create Crew Booking
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Banner Conflict Alert */}
        {conflicts.length > 0 && (
          <div className="mb-6 bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-pulse">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-200 text-rose-800 rounded-xl">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-rose-900 text-sm">
                  ⚠️ Double Booking Conflict Detected ({conflicts.length} Crew Conflict{conflicts.length > 1 ? "s" : ""})
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  Some crew members are assigned to multiple wedding events on the same date. Check details below or switch to the Conflicts tab.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("conflicts")}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg self-start md:self-auto cursor-pointer"
            >
              View Conflicts
            </button>
          </div>
        )}

        {/* View Tabs Header */}
        <div className="border-b border-stone-200 mb-8 flex items-center justify-between gap-4">
          <div className="flex gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab("bookings")}
              className={`pb-3 text-sm font-medium transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "bookings"
                  ? "text-stone-900 border-b-2 border-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <Users className="h-4 w-4 text-amber-600" />
              <span>All Bookings ({bookings.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("calendar")}
              className={`pb-3 text-sm font-medium transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "calendar"
                  ? "text-stone-900 border-b-2 border-stone-900 font-bold"
                  : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <CalendarIcon className="h-4 w-4 text-amber-600" />
              <span>Crew Schedule Calendar</span>
            </button>

            <button
              onClick={() => setActiveTab("conflicts")}
              className={`pb-3 text-sm font-medium transition-all relative shrink-0 flex items-center gap-2 cursor-pointer ${
                activeTab === "conflicts"
                  ? "text-rose-600 border-b-2 border-rose-500 font-bold"
                  : "text-stone-400 hover:text-stone-700"
              }`}
            >
              <AlertTriangle className={`h-4 w-4 ${conflicts.length > 0 ? "text-rose-600" : ""}`} />
              <span>Conflicts ({conflicts.length})</span>
            </button>
          </div>

          {/* Search & Status Filter (visible on Bookings tab) */}
          {activeTab === "bookings" && (
            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search event, side, venue, city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 w-52"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400 text-stone-700 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          )}
        </div>

        {/* TAB 1: ALL BOOKINGS LIST */}
        {activeTab === "bookings" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent mb-3"></div>
                <p className="text-stone-500 text-xs font-mono uppercase tracking-wider">Loading Crew Assignments...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8">
                <Users className="h-12 w-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-lg font-serif font-bold text-stone-800">No Crew Bookings Found</h3>
                <p className="text-stone-500 text-xs mt-1 max-w-md mx-auto">
                  Create a new wedding crew booking to start assigning freelance photographers, cinematographers, drone operators, and editors.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg shadow-sm"
                >
                  <Plus className="h-4 w-4" /> Create First Crew Booking
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredBookings.map((booking) => {
                  const totalCrew = booking.events?.reduce(
                    (acc, evt) => acc + (evt.crewAssignments?.length || 0),
                    0
                  );

                  return (
                    <div
                      key={booking.id}
                      className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden hover:border-amber-300 transition-all group"
                    >
                      {/* Booking Header Banner */}
                      <div className="p-6 bg-stone-50/70 border-b border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                booking.status === "Accepted"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : booking.status === "Completed"
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : booking.status === "Rejected"
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {booking.status}
                            </span>

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                              {booking.weddingSide || "Both Side"}
                            </span>

                            {booking.eventDate && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-stone-200 text-stone-800">
                                📅 {booking.eventDate}
                              </span>
                            )}

                            <span className="text-xs font-mono text-stone-400 uppercase">
                              ID: {booking.id.substring(0, 10)}
                            </span>
                          </div>

                          <h2 className="text-xl font-serif font-bold text-stone-900">
                            {booking.event || (booking.brideName && booking.groomName ? `${booking.brideName} & ${booking.groomName}` : "Wedding Assignment")}
                          </h2>
                          <p className="text-xs text-stone-500 mt-0.5">
                            Side: <strong className="text-stone-800">{booking.weddingSide || "Both Side"}</strong> • Venue:{" "}
                            <span className="text-amber-800 font-medium">{booking.venue || "N/A"}</span> ({booking.city || "N/A"})
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingBooking(JSON.parse(JSON.stringify(booking)));
                              setIsModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-lg border border-stone-300 flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                          >
                            <Edit className="h-3.5 w-3.5 text-stone-500" /> Manage Crew & Events
                          </button>

                          <button
                            onClick={() => handleDuplicateBooking(booking)}
                            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold rounded-lg border border-amber-200 flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                            title="Duplicate Booking"
                          >
                            <Copy className="h-3.5 w-3.5 text-amber-700" /> Duplicate Booking
                          </button>

                          <button
                            onClick={() => handleOpenDeleteModal(booking)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete Booking"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Main Booking Details */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-xs text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-200">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-mono">Wedding Side</span>
                              <strong className="text-stone-800">{booking.weddingSide || "Both Side"}</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-mono">Venue & City</span>
                              <strong className="text-stone-800">{booking.venue || "N/A"} ({booking.city || "N/A"})</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-mono">Total Crew Assigned</span>
                              <strong className="text-stone-800">{totalCrew} Crew Members ({booking.events?.length || 0} Events)</strong>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                            <div>
                              <span className="text-stone-400 block text-[10px] uppercase font-mono">General Notes</span>
                              <span className="text-stone-700 truncate block max-w-xs">{booking.notes || "No special notes"}</span>
                            </div>
                          </div>
                        </div>

                        {/* CONSOLIDATED CREW ROSTER & DISPATCH (1 BUTTON PER FREELANCER) */}
                        {(() => {
                          const uniqueFreelancers = getUniqueFreelancersForBooking(booking);
                          return (
                            <div className="mb-6 bg-stone-900 p-4 rounded-xl text-white shadow-md">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-stone-800">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-amber-400" />
                                  <h3 className="font-serif font-bold text-sm text-amber-200">
                                    Consolidated Crew Assignments ({uniqueFreelancers.length} Freelancer{uniqueFreelancers.length !== 1 ? 's' : ''})
                                  </h3>
                                </div>
                                <span className="text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
                                  1 PDF & 1 WhatsApp Message Per Freelancer
                                </span>
                              </div>

                              {uniqueFreelancers.length === 0 ? (
                                <p className="text-xs text-stone-400 italic">No crew assigned yet. Click "Manage Crew & Events" to assign freelancers.</p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {uniqueFreelancers.map((freelancer) => (
                                    <div key={freelancer.key} className="bg-stone-800/90 border border-stone-700/80 rounded-lg p-3 space-y-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-white">{freelancer.name}</span>
                                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded uppercase">
                                              {freelancer.role}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-stone-400 mt-0.5">
                                            📞 {freelancer.phone || "No Phone"} • Fee: <strong className="text-emerald-400">₹{freelancer.totalPayment.toLocaleString("en-IN")}</strong>
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {/* ONE WhatsApp Button */}
                                          <button
                                            onClick={() => handleSendWhatsAppForFreelancer(booking, freelancer)}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                            title="Send 1 WhatsApp message covering all assigned events"
                                          >
                                            <Send className="h-3 w-3" />
                                            <span>WhatsApp</span>
                                          </button>

                                          {/* ONE PDF Button */}
                                          <button
                                            onClick={() => handleDownloadPdfForFreelancer(booking, freelancer)}
                                            className="px-2.5 py-1 bg-stone-900 hover:bg-stone-950 text-amber-300 border border-stone-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                            title="Download 1 Assignment PDF covering all assigned events"
                                          >
                                            <Download className="h-3 w-3 text-amber-400" />
                                            <span>PDF</span>
                                          </button>
                                        </div>
                                      </div>

                                      {/* Assigned Events Badges */}
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-700/60">
                                        <span className="text-[10px] font-mono text-stone-400">Assigned Events:</span>
                                        {freelancer.assignedEvents.map((evt) => (
                                          <span key={evt.id} className="px-2 py-0.5 bg-stone-900 text-stone-200 border border-stone-700 rounded text-[10px] font-medium">
                                            {evt.eventName} ({evt.eventDate || "TBD"})
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Events Sections & Assigned Crew */}
                        <div className="space-y-4">
                          <h3 className="font-serif font-bold text-sm text-stone-800 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-amber-700" />
                            Event Details & Schedule
                          </h3>

                          {(!booking.events || booking.events.length === 0) ? (
                            <p className="text-xs text-stone-400 italic">No event sections created yet. Click Manage Crew & Events to add events.</p>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {booking.events.map((evt) => (
                                <div
                                  key={evt.id}
                                  className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:border-amber-300 transition-all"
                                >
                                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                                      <h4 className="font-serif font-bold text-sm text-stone-900">
                                        {evt.eventName}
                                      </h4>
                                    </div>
                                    <span className="text-xs font-mono font-semibold text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
                                      📅 {evt.eventDate}
                                    </span>
                                  </div>

                                  <div className="text-xs text-stone-600 space-y-1 mb-3">
                                    <p className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                                      <span className="font-medium text-stone-800">{evt.venue || "Venue TBD"}</span>
                                    </p>
                                    {evt.googleMapsLink && (
                                      <a
                                        href={evt.googleMapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-amber-700 hover:underline text-[11px] inline-flex items-center gap-1"
                                      >
                                        📍 Open Maps Link <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>

                                  {/* Crew Members List for this Event */}
                                  <div className="space-y-2 mt-3 pt-2 border-t border-stone-100">
                                    <span className="text-[10px] font-mono uppercase text-stone-400 block tracking-wider">
                                      Crew Assigned for {evt.eventName} ({evt.crewAssignments?.length || 0})
                                    </span>

                                    {(!evt.crewAssignments || evt.crewAssignments.length === 0) ? (
                                      <p className="text-xs text-stone-400 italic">No crew assigned for {evt.eventName}</p>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {evt.crewAssignments.map((crew) => (
                                          <span
                                            key={crew.id}
                                            className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
                                          >
                                            <span className="font-bold">{crew.name}</span>
                                            <span className="text-[10px] bg-amber-200/60 px-1 py-0.2 rounded font-mono uppercase text-amber-950">
                                              {crew.role}
                                            </span>
                                            <span className="text-emerald-700 font-bold text-[10px]">₹{Number(crew.payment || 0).toLocaleString("en-IN")}</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CALENDAR VIEW */}
        {activeTab === "calendar" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm">
            {/* Month Header Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-serif font-bold text-stone-900">
                  {currentCalendarDate.toLocaleString("default", { month: "long" })}{" "}
                  {currentCalendarDate.getFullYear()}
                </h2>
                <span className="text-xs font-mono text-stone-400 uppercase">
                  Crew Event Deployment Schedule
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentCalendarDate(
                      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
                    )
                  }
                  className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setCurrentCalendarDate(new Date())}
                  className="px-3 py-1.5 border border-stone-200 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Today
                </button>
                <button
                  onClick={() =>
                    setCurrentCalendarDate(
                      new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
                    )
                  }
                  className="p-2 border border-stone-200 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-50 cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs font-bold text-stone-400 uppercase mb-2">
              <div className="py-2">Sun</div>
              <div className="py-2">Mon</div>
              <div className="py-2">Tue</div>
              <div className="py-2">Wed</div>
              <div className="py-2">Thu</div>
              <div className="py-2">Fri</div>
              <div className="py-2">Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {daysInMonth.map((day, idx) => {
                if (!day.isCurrentMonth) {
                  return <div key={`empty-${idx}`} className="h-28 bg-stone-50/50 rounded-xl border border-dashed border-stone-200"></div>;
                }

                const dayEvents = calendarEventsMap.get(day.dateStr) || [];
                const isToday = new Date().toISOString().split("T")[0] === day.dateStr;

                // Check conflict on this day
                const dayConflicts = conflicts.filter((c) => c.date === day.dateStr);

                return (
                  <div
                    key={day.dateStr}
                    className={`h-32 p-2 rounded-xl border overflow-y-auto transition-all ${
                      isToday
                        ? "bg-amber-50/50 border-amber-300 ring-2 ring-amber-300/50"
                        : dayConflicts.length > 0
                        ? "bg-rose-50/70 border-rose-300"
                        : dayEvents.length > 0
                        ? "bg-stone-50 border-stone-200"
                        : "bg-white border-stone-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold font-mono ${isToday ? "text-amber-800" : "text-stone-700"}`}>
                        {day.dayNum}
                      </span>
                      {dayConflicts.length > 0 && (
                        <span className="h-2 w-2 rounded-full bg-rose-600" title="Double Booking Conflict!"></span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {dayEvents.map(({ booking, event }) => (
                        <div
                          key={`${booking.id}-${event.id}`}
                          className="p-1.5 rounded text-[10px] bg-white border border-stone-200 shadow-2xs hover:border-amber-400 cursor-pointer"
                          onClick={() => {
                            setEditingBooking(JSON.parse(JSON.stringify(booking)));
                            setIsModalOpen(true);
                          }}
                        >
                          <p className="font-bold text-stone-900 truncate">
                            {booking.event || "Wedding Assignment"}
                          </p>
                          <p className="text-amber-800 truncate font-semibold">
                            {event.eventName} ({booking.weddingSide || "Both Side"})
                          </p>
                          <p className="text-[9px] text-stone-400">
                            👤 {event.crewAssignments?.length || 0} Crew
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: CONFLICTS TAB */}
        {activeTab === "conflicts" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" /> Crew Double Booking Detector
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Automated conflict engine detecting crew members assigned to multiple events on the same calendar day.
                </p>
              </div>

              <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-300">
                {conflicts.length} Active Conflict{conflicts.length !== 1 ? "s" : ""}
              </span>
            </div>

            {conflicts.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-serif font-bold text-stone-800">No Double Booking Conflicts</h3>
                <p className="text-xs text-stone-500 mt-1">All freelance photographers and cinematographers have clean schedules.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-rose-700" />
                        <h4 className="font-bold text-rose-900 text-sm">{conflict.crewName}</h4>
                        <span className="text-xs font-mono text-stone-600">({conflict.phone})</span>
                      </div>
                      <span className="text-xs font-mono font-bold bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded">
                        📅 Overlapping Date: {conflict.date}
                      </span>
                    </div>

                    <p className="text-xs text-rose-800 mb-2 font-medium">Assigned to the following events on this date:</p>
                    <ul className="list-disc list-inside text-xs text-stone-800 space-y-1 bg-white p-3 rounded-lg border border-rose-200">
                      {conflict.eventTitles.map((title, tidx) => (
                        <li key={tidx} className="font-semibold">{title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE / EDIT BOOKING MODAL */}
      {isModalOpen && editingBooking && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 animate-scale-up">
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-stone-900">
                  {editingBooking.id ? "Edit Wedding Crew Booking" : "New Wedding Crew Booking"}
                </h2>
                <p className="text-xs text-stone-500">Configure event schedule and assign freelance crew members.</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBooking(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-900 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBooking} className="p-6 space-y-8">
              {/* SECTION 1: ASSIGNMENT OVERVIEW */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                    <Users className="h-4 w-4" /> 1. Assignment Overview
                  </h3>
                  <span className="text-[10px] font-mono text-stone-400 uppercase">Assignment Metadata</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Wedding Side *
                    </label>
                    <select
                      required
                      value={editingBooking.weddingSide || "Both Side"}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          weddingSide: e.target.value as WeddingSide,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-semibold text-stone-800 cursor-pointer"
                    >
                      <option value="Bride Side">Bride Side</option>
                      <option value="Groom Side">Groom Side</option>
                      <option value="Both Side">Both Side</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Event *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wedding & Reception"
                      value={editingBooking.event || ""}
                      onChange={(e) =>
                        setEditingBooking({ ...editingBooking, event: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editingBooking.eventDate || ""}
                      onChange={(e) =>
                        setEditingBooking({ ...editingBooking, eventDate: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* DYNAMIC BRIDE & GROOM DETAILS SECTIONS */}
                {(() => {
                  const side = editingBooking.weddingSide || "Both Side";
                  const showBride = side === "Bride Side" || side === "Both Side";
                  const showGroom = side === "Groom Side" || side === "Both Side";

                  return (
                    <div className="space-y-3 transition-all duration-300">
                      {/* BRIDE DETAILS BLOCK */}
                      {showBride && (
                        <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 space-y-3 transition-all duration-300 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">👰</span>
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-rose-900">
                                Bride Details {side === "Both Side" && "(Bride Side)"}
                              </h4>
                            </div>
                            <span className="text-[10px] text-rose-700 font-medium">Bride Side Info</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Bride Name *
                              </label>
                              <input
                                type="text"
                                required={showBride}
                                placeholder="e.g. Ananya Chatterjee"
                                value={editingBooking.brideName || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, brideName: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white font-medium text-stone-800"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Bride Phone <span className="text-stone-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="tel"
                                placeholder="e.g. +91 98765 43210"
                                value={editingBooking.bridePhone || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, bridePhone: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Bride Family Contact <span className="text-stone-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Father: +91 98765 00000"
                                value={editingBooking.brideFamilyContact || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, brideFamilyContact: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-rose-500 focus:outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* GROOM DETAILS BLOCK */}
                      {showGroom && (
                        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-4 space-y-3 transition-all duration-300 animate-fadeIn">
                          <div className="flex items-center justify-between border-b border-sky-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">🤵</span>
                              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-sky-900">
                                Groom Details {side === "Both Side" && "(Groom Side)"}
                              </h4>
                            </div>
                            <span className="text-[10px] text-sky-700 font-medium">Groom Side Info</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Groom Name *
                              </label>
                              <input
                                type="text"
                                required={showGroom}
                                placeholder="e.g. Rohan Roy"
                                value={editingBooking.groomName || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, groomName: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white font-medium text-stone-800"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Groom Phone <span className="text-stone-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="tel"
                                placeholder="e.g. +91 98765 12345"
                                value={editingBooking.groomPhone || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, groomPhone: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-stone-700 mb-1">
                                Groom Family Contact <span className="text-stone-400 font-normal">(Optional)</span>
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. Brother: +91 98765 11111"
                                value={editingBooking.groomFamilyContact || ""}
                                onChange={(e) =>
                                  setEditingBooking({ ...editingBooking, groomFamilyContact: e.target.value })
                                }
                                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Venue
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. The Oberoi Grand"
                      value={editingBooking.venue || ""}
                      onChange={(e) =>
                        setEditingBooking({ ...editingBooking, venue: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kolkata"
                      value={editingBooking.city || ""}
                      onChange={(e) =>
                        setEditingBooking({ ...editingBooking, city: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Booking Status
                    </label>
                    <select
                      value={editingBooking.status || "Pending"}
                      onChange={(e) =>
                        setEditingBooking({
                          ...editingBooking,
                          status: e.target.value as BookingStatus,
                        })
                      }
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none bg-white font-semibold"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    General Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="General instructions for the booking..."
                    value={editingBooking.notes || ""}
                    onChange={(e) =>
                      setEditingBooking({ ...editingBooking, notes: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  ></textarea>
                </div>
              </div>

              {/* SECTION 2: EVENT SECTIONS & PER-EVENT CREW ASSIGNMENTS */}
              <div className="space-y-6 pt-4 border-t border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" /> 2. Event Sections & Per-Event Crew Assignments
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Each event card manages its own unique schedule, venue, notes, and assigned freelancers.
                    </p>
                  </div>

                  {/* Add Event Quick Pickers */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-stone-400 font-mono uppercase">Quick Add:</span>
                    {DEFAULT_EVENT_TYPES.map((evtName) => (
                      <button
                        key={evtName}
                        type="button"
                        onClick={() => handleAddEventSection(evtName)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                      >
                        + {evtName}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const customName = prompt("Enter Custom Event Name (e.g. Pre-Wedding Shoot, Gaye Holud):");
                        if (customName) handleAddEventSection(customName);
                      }}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      + Custom Event
                    </button>
                  </div>
                </div>

                {(!editingBooking.events || editingBooking.events.length === 0) ? (
                  <div className="text-center py-8 bg-stone-50 rounded-xl border border-dashed border-stone-300 p-4">
                    <p className="text-xs text-stone-500">No events added yet. Click the buttons above (+ Aiburo Bhat, + Mehendi, + Wedding, etc.) to create an event section.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {editingBooking.events.map((evt, evtIdx) => (
                      <div key={evt.id} className="bg-white border border-stone-300 rounded-2xl p-5 shadow-sm space-y-4">
                        {/* Event Header & Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="h-3 w-3 rounded-full bg-amber-600 shrink-0"></span>
                            <div className="w-full max-w-sm">
                              <label className="block text-[10px] font-mono text-stone-400 uppercase">Event Name *</label>
                              <input
                                type="text"
                                required
                                value={evt.eventName}
                                onChange={(e) => {
                                  const events = [...(editingBooking.events || [])];
                                  events[evtIdx].eventName = e.target.value;
                                  setEditingBooking({ ...editingBooking, events });
                                }}
                                className="w-full font-serif font-bold text-stone-900 text-base bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 focus:border-amber-600 focus:outline-none"
                                placeholder="Event Name"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDuplicateEventSection(evt.id)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer border border-stone-200"
                              title="Duplicate this event section with a new unique Event ID"
                            >
                              <Copy className="h-3.5 w-3.5" /> Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveEventSection(evt.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer border border-rose-200"
                              title="Delete this event section"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove Event
                            </button>
                          </div>
                        </div>

                        {/* Event Fields (Date, Venue, Maps Link, Notes) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">Event Date *</label>
                            <input
                              type="date"
                              required
                              value={evt.eventDate || ""}
                              onChange={(e) => {
                                const events = [...(editingBooking.events || [])];
                                events[evtIdx].eventDate = e.target.value;
                                setEditingBooking({ ...editingBooking, events });
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">Venue / Location</label>
                            <input
                              type="text"
                              placeholder="e.g. Courtyard, Oberoi Grand"
                              value={evt.venue || ""}
                              onChange={(e) => {
                                const events = [...(editingBooking.events || [])];
                                events[evtIdx].venue = e.target.value;
                                setEditingBooking({ ...editingBooking, events });
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-stone-600 mb-1">Google Maps URL</label>
                            <input
                              type="url"
                              placeholder="https://maps.google.com/..."
                              value={evt.googleMapsLink || ""}
                              onChange={(e) => {
                                const events = [...(editingBooking.events || [])];
                                events[evtIdx].googleMapsLink = e.target.value;
                                setEditingBooking({ ...editingBooking, events });
                              }}
                              className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-stone-600 mb-1">Event Notes & Special Instructions</label>
                          <input
                            type="text"
                            placeholder="Ritual guidelines, lighting directions, mandap details..."
                            value={evt.notes || ""}
                            onChange={(e) => {
                              const events = [...(editingBooking.events || [])];
                              events[evtIdx].notes = e.target.value;
                              setEditingBooking({ ...editingBooking, events });
                            }}
                            className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none"
                          />
                        </div>

                        {/* Freelancers Assigned Specially to THIS Event */}
                        <div className="pt-3 border-t border-stone-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-mono font-bold uppercase text-stone-800 flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5 text-amber-700" />
                              Crew Assigned specifically for "{evt.eventName}" ({evt.crewAssignments?.length || 0})
                            </span>

                            <button
                              type="button"
                              onClick={() => handleAddCrewMemberToEvent(evt.id)}
                              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Plus className="h-3.5 w-3.5" /> + Add Freelancer to {evt.eventName}
                            </button>
                          </div>

                          {(!evt.crewAssignments || evt.crewAssignments.length === 0) ? (
                            <p className="text-xs text-stone-400 italic bg-stone-50 p-3 rounded-lg border border-dashed border-stone-200">
                              No crew members assigned specifically for {evt.eventName} yet. Click "+ Add Freelancer to {evt.eventName}" or use Section 3 checkboxes below.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {evt.crewAssignments.map((crew) => (
                                <div key={crew.id} className="bg-stone-50 p-3.5 rounded-xl border border-stone-300 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Role</label>
                                      <select
                                        value={crew.role}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "role", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white font-medium"
                                      >
                                        {CREW_ROLES.map((role) => (
                                          <option key={role} value={role}>{role}</option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="sm:col-span-2">
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Crew Name *</label>
                                      <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={crew.name}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "name", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white font-bold text-stone-900"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Phone</label>
                                      <input
                                        type="text"
                                        placeholder="+91..."
                                        value={crew.phone}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "phone", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">WhatsApp</label>
                                      <input
                                        type="text"
                                        placeholder="91983..."
                                        value={crew.whatsappNumber}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "whatsappNumber", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                                    <div>
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Email</label>
                                      <input
                                        type="email"
                                        placeholder="email@domain.com"
                                        value={crew.email || ""}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "email", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Fee / Honorarium (₹)</label>
                                      <input
                                        type="number"
                                        placeholder="15000"
                                        value={crew.payment}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "payment", Number(e.target.value))}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white font-bold text-emerald-700"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[10px] font-mono text-stone-500 uppercase">Status</label>
                                      <select
                                        value={crew.status}
                                        onChange={(e) => handleUpdateCrewMemberInEvent(evt.id, crew.id, "status", e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-white"
                                      >
                                        <option value="Assigned">Assigned</option>
                                        <option value="Confirmed">Confirmed</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Declined">Declined</option>
                                      </select>
                                    </div>

                                    <div className="flex items-center justify-end pt-3">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveCrewMemberFromEvent(evt.id, crew.id)}
                                        className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="h-3 w-3" /> Remove Crew
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 3: CONSOLIDATED CREW ROSTER & MULTI-EVENT CHECKBOX MATRIX */}
              <div className="space-y-4 pt-6 border-t border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                      <Users className="h-4 w-4" /> 3. Consolidated Crew Roster & Multi-Event Matrix
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Easily manage freelancer assignments across all booking events using checkboxes. Only 1 PDF and 1 WhatsApp dispatch button are generated per freelancer.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddNewFreelancerToBooking}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> + Assign New Freelancer
                  </button>
                </div>

                {(() => {
                  const freelancersInModal = getUniqueFreelancersForBooking(editingBooking);

                  if (freelancersInModal.length === 0) {
                    return (
                      <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-300 p-4">
                        <p className="text-xs text-stone-500">No crew members assigned to this booking yet. Click "+ Assign New Freelancer" above.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {freelancersInModal.map((freelancer) => (
                        <div key={freelancer.key} className="bg-white p-4 rounded-xl border border-stone-300 shadow-sm space-y-3">
                          {/* Freelancer Main Info Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Role</label>
                              <select
                                value={freelancer.role}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "role", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-stone-50 font-medium"
                              >
                                {CREW_ROLES.map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Crew Name *</label>
                              <input
                                type="text"
                                placeholder="Full Name"
                                value={freelancer.name}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "name", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded font-bold text-stone-900"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Phone</label>
                              <input
                                type="text"
                                placeholder="+91..."
                                value={freelancer.phone}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "phone", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">WhatsApp</label>
                              <input
                                type="text"
                                placeholder="91983..."
                                value={freelancer.whatsappNumber}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "whatsappNumber", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                            <div>
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Email</label>
                              <input
                                type="email"
                                placeholder="email@domain.com"
                                value={freelancer.email}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "email", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Fee / Honorarium (₹)</label>
                              <input
                                type="number"
                                placeholder="15000"
                                value={freelancer.totalPayment}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "payment", Number(e.target.value))}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded font-bold text-emerald-700"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono text-stone-500 uppercase">Status</label>
                              <select
                                value={freelancer.status}
                                onChange={(e) => handleUpdateConsolidatedFreelancer(freelancer.key, "status", e.target.value)}
                                className="w-full py-1.5 px-2 text-xs border border-stone-300 rounded bg-stone-50"
                              >
                                <option value="Assigned">Assigned</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Pending">Pending</option>
                                <option value="Declined">Declined</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-end pt-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveFreelancerFromBooking(freelancer.key)}
                                className="text-rose-600 hover:text-rose-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" /> Remove Freelancer
                              </button>
                            </div>
                          </div>

                          {/* MULTI-EVENT CHECKBOX SELECTION */}
                          <div className="pt-2 border-t border-stone-200 bg-amber-50/60 p-3 rounded-lg">
                            <span className="block text-[11px] font-mono text-amber-900 font-bold uppercase mb-2">
                              Select Assigned Events for {freelancer.name || 'this freelancer'}:
                            </span>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              {(editingBooking.events || []).map((evt) => {
                                const isAssigned = freelancer.assignedEvents.some((e) => e.id === evt.id);
                                return (
                                  <label
                                    key={evt.id}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                                      isAssigned
                                        ? "bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-xs"
                                        : "bg-white border-stone-300 text-stone-600 hover:bg-stone-100"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAssigned}
                                      onChange={(e) => handleToggleFreelancerEvent(freelancer.key, evt.id, e.target.checked)}
                                      className="h-4 w-4 text-amber-700 rounded border-stone-300 focus:ring-amber-500 cursor-pointer"
                                    />
                                    <span>{evt.eventName}</span>
                                    {evt.eventDate && <span className="text-[10px] font-mono text-stone-500">({evt.eventDate})</span>}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Submit Buttons */}
              <div className="pt-6 border-t border-stone-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white p-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingBooking(null);
                  }}
                  className="px-5 py-2.5 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-2"
                >
                  {isLoading ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" /> Save Booking & Crew Roster
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalBooking && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden transform transition-all scale-100">
            {/* Header */}
            <div className="p-6 bg-rose-50 border-b border-rose-200 flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-serif font-bold text-rose-950">
                  Delete Wedding Crew Booking?
                </h3>
                <p className="text-xs text-rose-800 mt-1.5 leading-relaxed">
                  This action will permanently delete this booking, all assigned events, crew members, generated PDFs and related records.
                </p>
                <p className="text-xs font-bold text-rose-900 mt-1">
                  This action cannot be undone.
                </p>
              </div>
              {!isDeleting && (
                <button
                  onClick={() => setDeleteModalBooking(null)}
                  className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Target Booking Brief */}
            <div className="p-5 space-y-3 text-xs text-stone-600">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <div className="font-bold text-stone-900 text-sm">
                  {deleteModalBooking.event || "Wedding Assignment"}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                  <span>Side: <strong className="text-stone-700">{deleteModalBooking.weddingSide || "Both Side"}</strong></span>
                  <span>•</span>
                  <span>Date: <strong className="text-stone-700">{deleteModalBooking.eventDate || "N/A"}</strong></span>
                  <span>•</span>
                  <span>Events: <strong className="text-stone-700">{deleteModalBooking.events?.length || 0}</strong></span>
                </div>
              </div>

              {/* Progress Box */}
              {isDeleting && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-amber-700 animate-spin shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 text-xs">Deleting booking...</div>
                    <div className="text-[11px] text-amber-800">{deleteProgressMessage}</div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {deleteErrorMessage && (
                <div className="p-3.5 bg-rose-100 border border-rose-300 rounded-xl text-rose-900 flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs">Deletion Failed</div>
                    <div className="text-[11px] text-rose-800 font-mono mt-0.5">{deleteErrorMessage}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModalBooking(null)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteBooking}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
