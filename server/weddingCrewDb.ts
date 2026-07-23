import fs from "fs";
import path from "path";
import { isSupabaseConfigured, supabaseClient } from "./supabase.js";
import { WeddingCrewBooking } from "../src/types/weddingCrew.js";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "wedding_crew_bookings.json");

const defaultCrewBookings: WeddingCrewBooking[] = [
  {
    id: "crew-booking-demo-1",
    weddingSide: "Both Side",
    event: "Grand Wedding Celebration",
    eventDate: "2026-11-14",
    venue: "The Oberoi Grand",
    city: "Kolkata",
    status: "Accepted",
    notes: "High priority client. Require 4K drone cinematography.",
    clientName: "Ananya & Rohan Roy",
    brideName: "Ananya Chatterjee",
    groomName: "Rohan Roy",
    weddingCollection: "Royal Heritage Collection",
    events: [
      {
        id: "evt-1",
        eventName: "Aiburo Bhat",
        eventDate: "2026-11-12",
        venue: "Chatterjee Residence, Salt Lake",
        googleMapsLink: "https://maps.google.com/?q=Salt+Lake+Kolkata",
        notes: "Traditional rituals starting morning.",
        crewAssignments: [
          {
            id: "crew-1",
            groupKey: "fg-sayan",
            role: "Lead Photographer",
            name: "Sayan Mukherjee",
            phone: "+91 98300 12345",
            whatsappNumber: "919830012345",
            email: "sayan.photos@gmail.com",
            payment: "12000",
            status: "Confirmed",
            notes: "Traditional portrait specialist"
          },
          {
            id: "crew-2",
            groupKey: "fg-amitav",
            role: "Lead Cinematographer",
            name: "Amitav Ghosh",
            phone: "+91 98311 23456",
            whatsappNumber: "919831123456",
            email: "amitav.films@gmail.com",
            payment: "15000",
            status: "Confirmed",
            notes: "Cinematic reel specialist"
          }
        ]
      },
      {
        id: "evt-2",
        eventName: "Mehendi",
        eventDate: "2026-11-13",
        venue: "The Grand Ballroom, Oberoi",
        googleMapsLink: "https://maps.google.com/?q=Oberoi+Grand+Kolkata",
        notes: "Vibrant candid moments.",
        crewAssignments: [
          {
            id: "crew-3",
            groupKey: "fg-priya",
            role: "Lead Photographer",
            name: "Priya Das",
            phone: "+91 98322 34567",
            whatsappNumber: "919832234567",
            email: "priya.captures@gmail.com",
            payment: "10000",
            status: "Confirmed",
            notes: "Candid specialist"
          }
        ]
      },
      {
        id: "evt-3",
        eventName: "Wedding",
        eventDate: "2026-11-14",
        venue: "The Oberoi Grand Courtyard",
        googleMapsLink: "https://maps.google.com/?q=Oberoi+Grand+Courtyard",
        notes: "Main event. Full crew deployment.",
        crewAssignments: [
          {
            id: "crew-4",
            groupKey: "fg-sayan",
            role: "Lead Photographer",
            name: "Sayan Mukherjee",
            phone: "+91 98300 12345",
            whatsappNumber: "919830012345",
            email: "sayan.photos@gmail.com",
            payment: "25000",
            status: "Confirmed",
            notes: "Mandap and rituals focus"
          },
          {
            id: "crew-5",
            groupKey: "fg-priya",
            role: "Second Photographer",
            name: "Priya Das",
            phone: "+91 98322 34567",
            whatsappNumber: "919832234567",
            email: "priya.captures@gmail.com",
            payment: "15000",
            status: "Confirmed",
            notes: "Guest & decor candids"
          },
          {
            id: "crew-6",
            groupKey: "fg-vikram",
            role: "Drone Operator",
            name: "Vikram Sen",
            phone: "+91 98333 45678",
            whatsappNumber: "919833345678",
            email: "vikram.drones@gmail.com",
            payment: "18000",
            status: "Confirmed",
            notes: "Outdoor aerial shots"
          }
        ]
      },
      {
        id: "evt-4",
        eventName: "Reception",
        eventDate: "2026-11-16",
        venue: "PC Chandra Gardens, Kolkata",
        googleMapsLink: "https://maps.google.com/?q=PC+Chandra+Gardens",
        notes: "Stage setups and family group shots.",
        crewAssignments: [
          {
            id: "crew-7",
            groupKey: "fg-sayan",
            role: "Lead Photographer",
            name: "Sayan Mukherjee",
            phone: "+91 98300 12345",
            whatsappNumber: "919830012345",
            email: "sayan.photos@gmail.com",
            payment: "20000",
            status: "Confirmed"
          }
        ]
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function ensureStoreFile(): WeddingCrewBooking[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(defaultCrewBookings, null, 2), "utf-8");
    return defaultCrewBookings;
  }

  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    if (!raw || !raw.trim()) {
      fs.writeFileSync(STORE_FILE, JSON.stringify(defaultCrewBookings, null, 2), "utf-8");
      return defaultCrewBookings;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Recovering wedding_crew_bookings.json with defaults after parse issue:", err);
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(defaultCrewBookings, null, 2), "utf-8");
    } catch (_) {}
    return defaultCrewBookings;
  }
}

function saveLocalStore(bookings: WeddingCrewBooking[]) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(STORE_FILE, JSON.stringify(bookings, null, 2), "utf-8");
}

export const weddingCrewDb = {
  async getAll(): Promise<WeddingCrewBooking[]> {
    const localData = ensureStoreFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from("wedding_crew_bookings")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((item: any) => ({
            id: item.id,
            weddingSide: item.wedding_side || item.weddingSide || "Both Side",
            event: item.event || "Wedding Event",
            eventDate: item.event_date || item.eventDate || "",
            clientName: item.client_name,
            brideName: item.bride_name,
            groomName: item.groom_name,
            weddingCollection: item.wedding_collection,
            venue: item.venue,
            city: item.city,
            notes: item.notes,
            status: item.status,
            events: typeof item.events === "string" ? JSON.parse(item.events) : (item.events || []),
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));
        }
      } catch (err) {
        console.warn("Supabase fetch wedding_crew_bookings warning, using local file:", err);
      }
    }

    return localData;
  },

  async getById(id: string): Promise<WeddingCrewBooking | null> {
    const all = await this.getAll();
    return all.find((b) => b.id === id) || null;
  },

  async create(data: Omit<WeddingCrewBooking, "id" | "createdAt" | "updatedAt">): Promise<WeddingCrewBooking> {
    const localData = ensureStoreFile();
    const now = new Date().toISOString();
    const newBooking: WeddingCrewBooking = {
      ...data,
      id: `crew-booking-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };

    localData.unshift(newBooking);
    saveLocalStore(localData);

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("wedding_crew_bookings").insert({
          id: newBooking.id,
          client_name: newBooking.clientName,
          bride_name: newBooking.brideName,
          groom_name: newBooking.groomName,
          wedding_collection: newBooking.weddingCollection,
          venue: newBooking.venue,
          city: newBooking.city,
          notes: newBooking.notes || "",
          status: newBooking.status,
          events: newBooking.events,
          created_at: newBooking.createdAt,
          updated_at: newBooking.updatedAt,
        });
      } catch (err) {
        console.warn("Supabase insert wedding_crew_bookings error:", err);
      }
    }

    return newBooking;
  },

  async update(id: string, updates: Partial<WeddingCrewBooking>): Promise<WeddingCrewBooking | null> {
    const localData = ensureStoreFile();
    const idx = localData.findIndex((b) => b.id === id);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    const updated: WeddingCrewBooking = {
      ...localData[idx],
      ...updates,
      updatedAt: now,
    };

    localData[idx] = updated;
    saveLocalStore(localData);

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient
          .from("wedding_crew_bookings")
          .update({
            client_name: updated.clientName,
            bride_name: updated.brideName,
            groom_name: updated.groomName,
            wedding_collection: updated.weddingCollection,
            venue: updated.venue,
            city: updated.city,
            notes: updated.notes || "",
            status: updated.status,
            events: updated.events,
            updated_at: updated.updatedAt,
          })
          .eq("id", id);
      } catch (err) {
        console.warn("Supabase update wedding_crew_bookings error:", err);
      }
    }

    return updated;
  },

  async delete(id: string): Promise<boolean> {
    const localData = ensureStoreFile();
    const filtered = localData.filter((b) => b.id !== id);
    if (filtered.length === localData.length) return false;

    saveLocalStore(filtered);

    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { error } = await supabaseClient.from("wedding_crew_bookings").delete().eq("id", id);
        if (error) {
          console.warn("Supabase delete wedding_crew_bookings warning:", error.message);
        }
      } catch (err: any) {
        console.warn("Supabase delete error:", err);
      }
    }

    return true;
  },
};
