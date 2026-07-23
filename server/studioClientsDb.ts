import { supabaseClient, isSupabaseConfigured } from "./supabase.js";
import { generateUuid } from "./supabaseDb.js";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const STUDIO_DATA_FILE = path.join(DATA_DIR, "studio_clients_store.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface Studio {
  id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  logoUrl?: string | null;
  plan: "Basic" | "Pro" | "Business";
  status: "Active" | "Trial" | "Expired" | "Suspended";
  registrationDate: string;
  lastLogin: string;
  trialDaysLeft: number;
  storageUsed: number; // in bytes
  storageLimit: number; // in bytes
  totalClients: number;
  totalAlbums: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  studioId: string;
  plan: "Basic" | "Pro" | "Business";
  price: number;
  status: "Active" | "Trial" | "Expired" | "Cancelled";
  startDate: string;
  expiryDate: string;
  trialDaysLeft: number;
  features: string[];
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRequest {
  id: string;
  studioId: string;
  studioName: string;
  ownerName: string;
  email: string;
  plan: "Basic" | "Pro" | "Business";
  amount: number;
  screenshotUrl: string;
  utrNumber: string;
  paymentDate: string;
  status: "Pending" | "Approved" | "Rejected";
  adminNotes?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  studioId: string;
  studioName: string;
  plan: "Basic" | "Pro" | "Business";
  amount: number;
  utrNumber: string;
  paymentMethod: string;
  status: "Completed" | "Pending" | "Failed" | "Refunded";
  paidAt: string;
}

export interface StorageUsage {
  id: string;
  studioId: string;
  usedBytes: number;
  limitBytes: number;
  photosCount: number;
  albumsCount: number;
  lastUpdated: string;
}

export interface ActivityLog {
  id: string;
  studioId?: string | null;
  studioName?: string | null;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress?: string | null;
  timestamp: string;
}

export interface UpiSettings {
  upiId: string;
  qrCodeUrl: string;
  instructions: string;
  recipientName: string;
}

// In-Memory store fallback
class StudioClientsMemoryStore {
  studios: Map<string, Studio> = new Map();
  subscriptions: Map<string, Subscription> = new Map();
  paymentRequests: Map<string, PaymentRequest> = new Map();
  payments: Map<string, Payment> = new Map();
  storageUsages: Map<string, StorageUsage> = new Map();
  activityLogs: ActivityLog[] = [];
  upiSettings: UpiSettings = {
    upiId: "studiophoto@upi",
    qrCodeUrl: "https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=400&q=80",
    instructions: "Pay using any UPI App (GPay, PhonePe, Paytm). Upload the payment screenshot and enter the 12-digit UTR/UPI Transaction Reference number for instant auto-approval.",
    recipientName: "Studio Admin Services",
  };

  constructor() {
    this.loadFromFile();
    if (this.studios.size === 0) {
      this.seedDefaultData();
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(STUDIO_DATA_FILE)) {
        const raw = fs.readFileSync(STUDIO_DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (parsed.studios) {
          parsed.studios.forEach((s: Studio) => this.studios.set(s.id, s));
        }
        if (parsed.subscriptions) {
          parsed.subscriptions.forEach((sub: Subscription) => this.subscriptions.set(sub.id, sub));
        }
        if (parsed.paymentRequests) {
          parsed.paymentRequests.forEach((pr: PaymentRequest) => this.paymentRequests.set(pr.id, pr));
        }
        if (parsed.payments) {
          parsed.payments.forEach((p: Payment) => this.payments.set(p.id, p));
        }
        if (parsed.storageUsages) {
          parsed.storageUsages.forEach((su: StorageUsage) => this.storageUsages.set(su.id, su));
        }
        if (parsed.activityLogs) {
          this.activityLogs = parsed.activityLogs;
        }
        if (parsed.upiSettings) {
          this.upiSettings = parsed.upiSettings;
        }
      }
    } catch (e) {
      console.warn("Notice: Loading studio_clients_store.json fallback:", e);
    }
  }

  public saveToFile() {
    try {
      const data = {
        studios: Array.from(this.studios.values()),
        subscriptions: Array.from(this.subscriptions.values()),
        paymentRequests: Array.from(this.paymentRequests.values()),
        payments: Array.from(this.payments.values()),
        storageUsages: Array.from(this.storageUsages.values()),
        activityLogs: this.activityLogs,
        upiSettings: this.upiSettings,
      };
      fs.writeFileSync(STUDIO_DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.error("Error saving studio clients store:", e);
    }
  }

  private seedDefaultData() {
    const now = new Date();
    const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
    const future = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

    const sampleStudios: Studio[] = [
      {
        id: "studio-101",
        name: "Lumiere Wedding Studios",
        ownerName: "Kazi Asmaul Haque",
        email: "kaziasmaulhaque2001@gmail.com",
        phone: "+91 98765 43210",
        logoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
        plan: "Business",
        status: "Active",
        registrationDate: ago(45),
        lastLogin: ago(0.2),
        trialDaysLeft: 0,
        storageUsed: 18 * 1024 * 1024 * 1024,
        storageLimit: 500 * 1024 * 1024 * 1024,
        totalClients: 24,
        totalAlbums: 18,
        createdAt: ago(45),
        updatedAt: ago(0.2),
      },
      {
        id: "studio-102",
        name: "Asmaul Production Official",
        ownerName: "Asmaul Production",
        email: "asmaulproductionofficial@gmail.com",
        phone: "+91 91234 56789",
        logoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
        plan: "Pro",
        status: "Trial",
        registrationDate: ago(3),
        lastLogin: ago(0.5),
        trialDaysLeft: 4,
        storageUsed: 4.2 * 1024 * 1024 * 1024,
        storageLimit: 100 * 1024 * 1024 * 1024,
        totalClients: 8,
        totalAlbums: 5,
        createdAt: ago(3),
        updatedAt: ago(0.5),
      },
      {
        id: "studio-103",
        name: "Vogue Wedding Photography",
        ownerName: "Alex Morgan",
        email: "alex.morgan@gmail.com",
        phone: "+1 (555) 019-2831",
        logoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        plan: "Basic",
        status: "Active",
        registrationDate: ago(20),
        lastLogin: ago(1),
        trialDaysLeft: 0,
        storageUsed: 12.5 * 1024 * 1024 * 1024,
        storageLimit: 20 * 1024 * 1024 * 1024,
        totalClients: 12,
        totalAlbums: 9,
        createdAt: ago(20),
        updatedAt: ago(1),
      },
      {
        id: "studio-104",
        name: "Eternal Moments Cine",
        ownerName: "David Miller",
        email: "david@eternalmoments.com",
        phone: "+91 98111 22334",
        logoUrl: null,
        plan: "Basic",
        status: "Expired",
        registrationDate: ago(60),
        lastLogin: ago(12),
        trialDaysLeft: 0,
        storageUsed: 19.8 * 1024 * 1024 * 1024,
        storageLimit: 20 * 1024 * 1024 * 1024,
        totalClients: 15,
        totalAlbums: 11,
        createdAt: ago(60),
        updatedAt: ago(12),
      },
    ];

    sampleStudios.forEach((s) => {
      this.studios.set(s.id, s);

      this.subscriptions.set(`sub-${s.id}`, {
        id: `sub-${s.id}`,
        studioId: s.id,
        plan: s.plan,
        price: s.plan === "Business" ? 999 : s.plan === "Pro" ? 599 : 299,
        status: s.status === "Active" ? "Active" : s.status === "Trial" ? "Trial" : "Expired",
        startDate: s.registrationDate,
        expiryDate: s.status === "Trial" ? future(s.trialDaysLeft) : future(25),
        trialDaysLeft: s.trialDaysLeft,
        features:
          s.plan === "Business"
            ? ["Unlimited Everything", "500GB Storage", "Team Accounts", "Custom Branding", "Priority Support"]
            : s.plan === "Pro"
            ? ["Unlimited Clients", "100GB Storage", "Wedding Crew", "Analytics", "Branding"]
            : ["100 Clients", "20GB Storage", "Album Proofing", "Client Gallery", "PDF Export"],
        autoRenew: true,
        createdAt: s.registrationDate,
        updatedAt: ago(1),
      });

      this.storageUsages.set(`stg-${s.id}`, {
        id: `stg-${s.id}`,
        studioId: s.id,
        usedBytes: s.storageUsed,
        limitBytes: s.storageLimit,
        photosCount: s.totalAlbums * 120,
        albumsCount: s.totalAlbums,
        lastUpdated: ago(0.5),
      });
    });

    // Sample payment request
    const prId = "pr-901";
    this.paymentRequests.set(prId, {
      id: prId,
      studioId: "studio-102",
      studioName: "Asmaul Production Official",
      ownerName: "Asmaul Production",
      email: "asmaulproductionofficial@gmail.com",
      plan: "Pro",
      amount: 599,
      screenshotUrl: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80",
      utrNumber: "UPI123987456012",
      paymentDate: ago(0.2),
      status: "Pending",
      adminNotes: null,
      createdAt: ago(0.2),
    });

    // Sample completed payments
    this.payments.set("pay-801", {
      id: "pay-801",
      studioId: "studio-101",
      studioName: "Lumiere Wedding Studios",
      plan: "Business",
      amount: 999,
      utrNumber: "UPI887766554433",
      paymentMethod: "UPI",
      status: "Completed",
      paidAt: ago(15),
    });

    this.payments.set("pay-802", {
      id: "pay-802",
      studioId: "studio-103",
      studioName: "Vogue Wedding Photography",
      plan: "Basic",
      amount: 299,
      utrNumber: "UPI112233445566",
      paymentMethod: "UPI",
      status: "Completed",
      paidAt: ago(10),
    });

    // Sample Activity logs
    this.activityLogs = [
      {
        id: generateUuid(),
        studioId: "studio-101",
        studioName: "Lumiere Wedding Studios",
        userId: "super-admin",
        userName: "Super Admin",
        action: "SUBSCRIPTION_ACTIVATED",
        details: "Business Plan (₹999/mo) activated successfully.",
        timestamp: ago(15),
      },
      {
        id: generateUuid(),
        studioId: "studio-102",
        studioName: "Asmaul Production Official",
        userId: "studio-102",
        userName: "Asmaul Production",
        action: "PAYMENT_REQUEST_SUBMITTED",
        details: "Submitted UPI Payment Request for Pro Plan (₹599) with UTR UPI123987456012.",
        timestamp: ago(0.2),
      },
    ];

    this.saveToFile();
  }
}

export const studioStore = new StudioClientsMemoryStore();

// DB Helper Functions with Supabase sync attempt + memory fallback
export const studioDb = {
  async getAll(): Promise<Studio[]> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from("studios").select("*").order("createdAt", { ascending: false });
        if (!error && data && data.length > 0) {
          data.forEach((s) => studioStore.studios.set(s.id, s));
          return data;
        }
      } catch (e) {
        console.warn("Notice: Fetching studios from Supabase fallback:", e);
      }
    }
    return Array.from(studioStore.studios.values());
  },

  async getById(id: string): Promise<Studio | null> {
    if (isSupabaseConfigured && supabaseClient) {
      try {
        const { data } = await supabaseClient.from("studios").select("*").eq("id", id).single();
        if (data) {
          studioStore.studios.set(data.id, data);
          return data;
        }
      } catch (e) {
        // ignore
      }
    }
    return studioStore.studios.get(id) || null;
  },

  async getByEmail(email: string): Promise<Studio | null> {
    const list = await this.getAll();
    return list.find((s) => s.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async create(input: Partial<Studio>): Promise<Studio> {
    const now = new Date().toISOString();
    const plan = input.plan || "Pro";
    const defaultLimit = plan === "Business" ? 500 * 1024 * 1024 * 1024 : plan === "Pro" ? 100 * 1024 * 1024 * 1024 : 20 * 1024 * 1024 * 1024;

    const newStudio: Studio = {
      id: input.id || generateUuid(),
      name: input.name || "Untitled Studio",
      ownerName: input.ownerName || "Studio Owner",
      email: input.email || "owner@example.com",
      phone: input.phone || "+91 00000 00000",
      logoUrl: input.logoUrl || null,
      plan: plan,
      status: input.status || "Trial",
      registrationDate: now,
      lastLogin: now,
      trialDaysLeft: input.trialDaysLeft !== undefined ? input.trialDaysLeft : 7,
      storageUsed: 0,
      storageLimit: defaultLimit,
      totalClients: 0,
      totalAlbums: 0,
      createdAt: now,
      updatedAt: now,
    };

    studioStore.studios.set(newStudio.id, newStudio);

    // Create Subscription record
    const sub: Subscription = {
      id: `sub-${newStudio.id}`,
      studioId: newStudio.id,
      plan: newStudio.plan,
      price: newStudio.plan === "Business" ? 999 : newStudio.plan === "Pro" ? 599 : 299,
      status: newStudio.status === "Active" ? "Active" : "Trial",
      startDate: now,
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      trialDaysLeft: newStudio.trialDaysLeft,
      features:
        newStudio.plan === "Business"
          ? ["Unlimited Everything", "500GB Storage", "Team Accounts", "Custom Branding", "Priority Support"]
          : newStudio.plan === "Pro"
          ? ["Unlimited Clients", "100GB Storage", "Wedding Crew", "Analytics", "Branding"]
          : ["100 Clients", "20GB Storage", "Album Proofing", "Client Gallery", "PDF Export"],
      autoRenew: true,
      createdAt: now,
      updatedAt: now,
    };
    studioStore.subscriptions.set(sub.id, sub);

    // Storage Usage Record
    const stg: StorageUsage = {
      id: `stg-${newStudio.id}`,
      studioId: newStudio.id,
      usedBytes: 0,
      limitBytes: defaultLimit,
      photosCount: 0,
      albumsCount: 0,
      lastUpdated: now,
    };
    studioStore.storageUsages.set(stg.id, stg);

    // Activity log
    activityLogDb.add({
      studioId: newStudio.id,
      studioName: newStudio.name,
      userId: newStudio.id,
      userName: newStudio.ownerName,
      action: "STUDIO_REGISTERED",
      details: `New Studio registered with 7-day Trial on ${newStudio.plan} Plan.`,
    });

    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("studios").insert([newStudio]);
        await supabaseClient.from("subscriptions").insert([sub]);
        await supabaseClient.from("storage_usage").insert([stg]);
      } catch (e) {
        // fallback
      }
    }

    return newStudio;
  },

  async update(id: string, updates: Partial<Studio>): Promise<Studio | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const updated: Studio = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    studioStore.studios.set(id, updated);
    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("studios").update(updated).eq("id", id);
      } catch (e) {
        // fallback
      }
    }

    return updated;
  },

  async delete(id: string): Promise<boolean> {
    studioStore.studios.delete(id);
    studioStore.subscriptions.delete(`sub-${id}`);
    studioStore.storageUsages.delete(`stg-${id}`);
    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("studios").delete().eq("id", id);
        await supabaseClient.from("subscriptions").delete().eq("studioId", id);
        await supabaseClient.from("storage_usage").delete().eq("studioId", id);
      } catch (e) {
        // fallback
      }
    }
    return true;
  }
};

export const subscriptionDb = {
  async getByStudioId(studioId: string): Promise<Subscription | null> {
    const sub = studioStore.subscriptions.get(`sub-${studioId}`);
    if (sub) return sub;
    const all = Array.from(studioStore.subscriptions.values());
    return all.find((s) => s.studioId === studioId) || null;
  },

  async update(studioId: string, updates: Partial<Subscription>): Promise<Subscription | null> {
    let existing = await this.getByStudioId(studioId);
    if (!existing) {
      existing = {
        id: `sub-${studioId}`,
        studioId,
        plan: "Pro",
        price: 599,
        status: "Active",
        startDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        trialDaysLeft: 0,
        features: ["Unlimited Clients", "100GB Storage", "Wedding Crew", "Analytics"],
        autoRenew: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const updated: Subscription = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    studioStore.subscriptions.set(updated.id, updated);

    // Update parent studio plan & status if changed
    const studio = studioStore.studios.get(studioId);
    if (studio) {
      studio.plan = updated.plan;
      studio.status = updated.status as any;
      if (updated.plan === "Business") studio.storageLimit = 500 * 1024 * 1024 * 1024;
      else if (updated.plan === "Pro") studio.storageLimit = 100 * 1024 * 1024 * 1024;
      else if (updated.plan === "Basic") studio.storageLimit = 20 * 1024 * 1024 * 1024;
      studio.updatedAt = new Date().toISOString();
      studioStore.studios.set(studioId, studio);
    }

    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("subscriptions").upsert([updated]);
      } catch (e) {
        // fallback
      }
    }

    return updated;
  }
};

export const paymentRequestDb = {
  async getAll(): Promise<PaymentRequest[]> {
    return Array.from(studioStore.paymentRequests.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async create(input: Omit<PaymentRequest, "id" | "createdAt" | "status">): Promise<PaymentRequest> {
    const now = new Date().toISOString();
    const newPR: PaymentRequest = {
      ...input,
      id: generateUuid(),
      status: "Pending",
      createdAt: now,
    };

    studioStore.paymentRequests.set(newPR.id, newPR);

    activityLogDb.add({
      studioId: newPR.studioId,
      studioName: newPR.studioName,
      userId: newPR.studioId,
      userName: newPR.ownerName,
      action: "PAYMENT_REQUEST_SUBMITTED",
      details: `Submitted payment request for ${newPR.plan} plan (₹${newPR.amount}) with UTR ${newPR.utrNumber}.`,
    });

    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("payment_requests").insert([newPR]);
      } catch (e) {
        // fallback
      }
    }

    return newPR;
  },

  async approve(id: string, adminNotes?: string): Promise<PaymentRequest | null> {
    const pr = studioStore.paymentRequests.get(id);
    if (!pr) return null;

    pr.status = "Approved";
    pr.adminNotes = adminNotes || "Approved by Super Admin";
    studioStore.paymentRequests.set(id, pr);

    // Auto-Activate Subscription
    const expiryDate = new Date(Date.now() + 30 * 86400000).toISOString();
    await subscriptionDb.update(pr.studioId, {
      plan: pr.plan,
      price: pr.amount,
      status: "Active",
      startDate: new Date().toISOString(),
      expiryDate,
      trialDaysLeft: 0,
    });

    // Record Completed Payment
    const payment: Payment = {
      id: generateUuid(),
      studioId: pr.studioId,
      studioName: pr.studioName,
      plan: pr.plan,
      amount: pr.amount,
      utrNumber: pr.utrNumber,
      paymentMethod: "UPI",
      status: "Completed",
      paidAt: new Date().toISOString(),
    };
    studioStore.payments.set(payment.id, payment);

    activityLogDb.add({
      studioId: pr.studioId,
      studioName: pr.studioName,
      userId: "super-admin",
      userName: "Super Admin",
      action: "PAYMENT_APPROVED",
      details: `Approved UPI payment (₹${pr.amount}, UTR ${pr.utrNumber}). ${pr.plan} plan activated until ${new Date(expiryDate).toLocaleDateString()}.`,
    });

    studioStore.saveToFile();

    if (isSupabaseConfigured && supabaseClient) {
      try {
        await supabaseClient.from("payment_requests").update({ status: "Approved", adminNotes: pr.adminNotes }).eq("id", id);
        await supabaseClient.from("payments").insert([payment]);
      } catch (e) {
        // fallback
      }
    }

    return pr;
  },

  async reject(id: string, adminNotes?: string): Promise<PaymentRequest | null> {
    const pr = studioStore.paymentRequests.get(id);
    if (!pr) return null;

    pr.status = "Rejected";
    pr.adminNotes = adminNotes || "Rejected by Super Admin";
    studioStore.paymentRequests.set(id, pr);

    activityLogDb.add({
      studioId: pr.studioId,
      studioName: pr.studioName,
      userId: "super-admin",
      userName: "Super Admin",
      action: "PAYMENT_REJECTED",
      details: `Rejected payment request (UTR ${pr.utrNumber}): ${pr.adminNotes}`,
    });

    studioStore.saveToFile();
    return pr;
  },

  async delete(id: string): Promise<boolean> {
    studioStore.paymentRequests.delete(id);
    studioStore.saveToFile();
    return true;
  }
};

export const paymentDb = {
  async getAll(): Promise<Payment[]> {
    return Array.from(studioStore.payments.values()).sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }
};

export const storageUsageDb = {
  async getByStudioId(studioId: string): Promise<StorageUsage | null> {
    return studioStore.storageUsages.get(`stg-${studioId}`) || null;
  },

  async updateLimit(studioId: string, limitBytes: number): Promise<StorageUsage | null> {
    let existing = await this.getByStudioId(studioId);
    if (!existing) {
      existing = {
        id: `stg-${studioId}`,
        studioId,
        usedBytes: 0,
        limitBytes,
        photosCount: 0,
        albumsCount: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    existing.limitBytes = limitBytes;
    existing.lastUpdated = new Date().toISOString();
    studioStore.storageUsages.set(`stg-${studioId}`, existing);

    const studio = studioStore.studios.get(studioId);
    if (studio) {
      studio.storageLimit = limitBytes;
      studioStore.studios.set(studioId, studio);
    }

    activityLogDb.add({
      studioId,
      studioName: studio?.name || "Studio",
      userId: "super-admin",
      userName: "Super Admin",
      action: "STORAGE_LIMIT_UPDATED",
      details: `Storage limit updated to ${(limitBytes / (1024 * 1024 * 1024)).toFixed(0)} GB.`,
    });

    studioStore.saveToFile();
    return existing;
  }
};

export const activityLogDb = {
  getAll(): ActivityLog[] {
    return studioStore.activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  add(input: Omit<ActivityLog, "id" | "timestamp">): ActivityLog {
    const log: ActivityLog = {
      ...input,
      id: generateUuid(),
      timestamp: new Date().toISOString(),
    };
    studioStore.activityLogs.unshift(log);
    if (studioStore.activityLogs.length > 500) {
      studioStore.activityLogs = studioStore.activityLogs.slice(0, 500);
    }
    studioStore.saveToFile();
    return log;
  }
};

export const upiSettingsDb = {
  get(): UpiSettings {
    return studioStore.upiSettings;
  },

  update(updates: Partial<UpiSettings>): UpiSettings {
    studioStore.upiSettings = {
      ...studioStore.upiSettings,
      ...updates,
    };
    studioStore.saveToFile();
    return studioStore.upiSettings;
  }
};
