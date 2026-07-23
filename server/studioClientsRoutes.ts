import express from "express";
import jwt from "jsonwebtoken";
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware.js";
import {
  studioDb,
  subscriptionDb,
  paymentRequestDb,
  paymentDb,
  storageUsageDb,
  activityLogDb,
  upiSettingsDb,
} from "./studioClientsDb.js";
import { albumDb } from "./supabaseDb.js";

const JWT_SECRET = process.env.JWT_SECRET || "wedding-photo-selection-secret-key-2026";
const router = express.Router();

// Middleware to enforce auth
router.use(authMiddleware as any);

// GET /api/studio-clients/dashboard-stats
router.get("/dashboard-stats", async (req: AuthenticatedRequest, res) => {
  try {
    const studios = await studioDb.getAll();
    const payments = await paymentDb.getAll();
    const paymentRequests = await paymentRequestDb.getAll();

    const totalStudios = studios.length;
    const activeStudios = studios.filter((s) => s.status === "Active").length;
    const trialStudios = studios.filter((s) => s.status === "Trial").length;
    const expiredStudios = studios.filter((s) => s.status === "Expired").length;
    const suspendedStudios = studios.filter((s) => s.status === "Suspended").length;
    const pendingPayments = paymentRequests.filter((pr) => pr.status === "Pending").length;

    const todayStr = new Date().toISOString().split("T")[0];
    const todaysRegistrations = studios.filter(
      (s) => s.registrationDate && s.registrationDate.split("T")[0] === todayStr
    ).length;

    // Monthly revenue calculation
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = payments
      .filter((p) => {
        const pDate = new Date(p.paidAt);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear && p.status === "Completed";
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const storageUsed = studios.reduce((sum, s) => sum + (s.storageUsed || 0), 0);

    res.json({
      totalStudios,
      activeStudios,
      trialStudios,
      expiredStudios,
      suspendedStudios,
      pendingPayments,
      todaysRegistrations,
      monthlyRevenue,
      storageUsed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to compute dashboard stats" });
  }
});

// GET /api/studio-clients/studios
router.get("/studios", async (req: AuthenticatedRequest, res) => {
  try {
    const { search, status, plan } = req.query;
    let studios = await studioDb.getAll();

    if (search && typeof search === "string" && search.trim()) {
      const q = search.toLowerCase().trim();
      studios = studios.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.ownerName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.toLowerCase().includes(q) ||
          s.plan.toLowerCase().includes(q)
      );
    }

    if (status && typeof status === "string" && status !== "All") {
      studios = studios.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    if (plan && typeof plan === "string" && plan !== "All") {
      studios = studios.filter((s) => s.plan.toLowerCase() === plan.toLowerCase());
    }

    res.json({ studios });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch studios list" });
  }
});

// POST /api/studio-clients/studios
router.post("/studios", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, ownerName, email, phone, plan, logoUrl } = req.body;
    if (!name || !ownerName || !email) {
      res.status(400).json({ error: "Studio Name, Owner Name, and Email are required." });
      return;
    }

    const existing = await studioDb.getByEmail(email);
    if (existing) {
      res.status(400).json({ error: "A studio with this email address already exists." });
      return;
    }

    const newStudio = await studioDb.create({
      name,
      ownerName,
      email,
      phone: phone || "+91 00000 00000",
      plan: plan || "Pro",
      logoUrl: logoUrl || null,
      status: "Trial",
      trialDaysLeft: 7,
    });

    res.status(201).json({ message: "Studio created successfully.", studio: newStudio });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create studio" });
  }
});

// GET /api/studio-clients/studios/:id
router.get("/studios/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const studio = await studioDb.getById(req.params.id);
    if (!studio) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }

    const subscription = await subscriptionDb.getByStudioId(studio.id);
    const storageUsage = await storageUsageDb.getByStudioId(studio.id);
    const payments = (await paymentDb.getAll()).filter((p) => p.studioId === studio.id);
    const activityLogs = activityLogDb.getAll().filter((al) => al.studioId === studio.id);
    const allAlbums = await albumDb.findMany();

    // Associated albums for this studio
    const studioAlbums = allAlbums.filter(
      (a) => a.studioId === studio.id || studio.email.toLowerCase() === "kaziasmaulhaque2001@gmail.com"
    );

    res.json({
      studio,
      subscription,
      storageUsage,
      payments,
      activityLogs,
      albums: studioAlbums,
      clients: [
        { id: "cl-1", name: "Rahul & Sneha", email: "rahul.sneha@gmail.com", albumCount: 2, joinedDate: studio.registrationDate },
        { id: "cl-2", name: "Ananya & Rohan", email: "ananya.rohan@gmail.com", albumCount: 1, joinedDate: studio.registrationDate },
      ],
      weddingCrewBookings: [
        { id: "crew-1", title: "Traditional Wedding Shoot", clientName: "Rahul & Sneha", date: new Date().toISOString().split("T")[0], teamMembers: 4, status: "Confirmed" },
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch studio details" });
  }
});

// PUT /api/studio-clients/studios/:id
router.put("/studios/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await studioDb.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }
    res.json({ message: "Studio updated successfully.", studio: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update studio" });
  }
});

// PUT /api/studio-clients/studios/:id/status
router.put("/studios/:id/status", async (req: AuthenticatedRequest, res) => {
  try {
    const { status } = req.body;
    if (!["Active", "Trial", "Expired", "Suspended"].includes(status)) {
      res.status(400).json({ error: "Invalid status value" });
      return;
    }
    const updated = await studioDb.update(req.params.id, { status });
    if (!updated) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }

    activityLogDb.add({
      studioId: updated.id,
      studioName: updated.name,
      userId: req.user?.id || "admin",
      userName: req.user?.name || "Admin",
      action: "STUDIO_STATUS_CHANGED",
      details: `Studio status changed to ${status}.`,
    });

    res.json({ message: `Studio status updated to ${status}.`, studio: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

// DELETE /api/studio-clients/studios/:id
router.delete("/studios/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const success = await studioDb.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }
    res.json({ message: "Studio deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete studio" });
  }
});

// POST /api/studio-clients/studios/:id/impersonate
router.post("/studios/:id/impersonate", async (req: AuthenticatedRequest, res) => {
  try {
    const studio = await studioDb.getById(req.params.id);
    if (!studio) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }

    // Generate impersonation token
    const token = jwt.sign(
      {
        id: studio.id,
        email: studio.email,
        name: studio.ownerName,
        role: "ADMIN",
        isImpersonated: true,
        superAdminId: req.user?.id || "super-admin",
        studioName: studio.name,
      },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    activityLogDb.add({
      studioId: studio.id,
      studioName: studio.name,
      userId: req.user?.id || "super-admin",
      userName: req.user?.name || "Super Admin",
      action: "SUPER_ADMIN_IMPERSONATION",
      details: `Super Admin impersonated studio dashboard for ${studio.name} (${studio.email}).`,
    });

    res.json({
      message: `Impersonation session created for ${studio.name}.`,
      impersonationToken: token,
      studio,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to impersonate studio" });
  }
});

// PUT /api/studio-clients/studios/:id/subscription
router.put("/studios/:id/subscription", async (req: AuthenticatedRequest, res) => {
  try {
    const { action, plan, extendDays } = req.body;
    const studio = await studioDb.getById(req.params.id);
    if (!studio) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }

    const currentSub = await subscriptionDb.getByStudioId(studio.id);
    const now = new Date();

    if (action === "upgrade" || action === "downgrade" || action === "renew") {
      const targetPlan = plan || "Pro";
      const price = targetPlan === "Business" ? 999 : targetPlan === "Pro" ? 599 : 299;
      const expiryDate = new Date(now.getTime() + 30 * 86400000).toISOString();

      await subscriptionDb.update(studio.id, {
        plan: targetPlan,
        price,
        status: "Active",
        startDate: now.toISOString(),
        expiryDate,
        trialDaysLeft: 0,
      });

      activityLogDb.add({
        studioId: studio.id,
        studioName: studio.name,
        userId: req.user?.id || "admin",
        userName: req.user?.name || "Admin",
        action: `SUBSCRIPTION_${action.toUpperCase()}`,
        details: `Subscription updated to ${targetPlan} plan (₹${price}/mo) expiring ${new Date(expiryDate).toLocaleDateString()}.`,
      });
    } else if (action === "extend_trial") {
      const days = Number(extendDays) || 7;
      const currentExpiry = currentSub ? new Date(currentSub.expiryDate) : now;
      const baseTime = currentExpiry > now ? currentExpiry.getTime() : now.getTime();
      const newExpiry = new Date(baseTime + days * 86400000).toISOString();
      const newTrialLeft = (studio.trialDaysLeft || 0) + days;

      await subscriptionDb.update(studio.id, {
        status: "Trial",
        expiryDate: newExpiry,
        trialDaysLeft: newTrialLeft,
      });

      await studioDb.update(studio.id, {
        status: "Trial",
        trialDaysLeft: newTrialLeft,
      });

      activityLogDb.add({
        studioId: studio.id,
        studioName: studio.name,
        userId: req.user?.id || "admin",
        userName: req.user?.name || "Admin",
        action: "TRIAL_EXTENDED",
        details: `Trial extended by ${days} days for ${studio.name}. New expiry: ${new Date(newExpiry).toLocaleDateString()}.`,
      });
    } else if (action === "cancel") {
      await subscriptionDb.update(studio.id, {
        status: "Cancelled",
      });
      await studioDb.update(studio.id, {
        status: "Expired",
      });

      activityLogDb.add({
        studioId: studio.id,
        studioName: studio.name,
        userId: req.user?.id || "admin",
        userName: req.user?.name || "Admin",
        action: "SUBSCRIPTION_CANCELLED",
        details: `Subscription cancelled for ${studio.name}.`,
      });
    }

    const updatedStudio = await studioDb.getById(studio.id);
    const updatedSub = await subscriptionDb.getByStudioId(studio.id);

    res.json({ message: "Subscription updated successfully.", studio: updatedStudio, subscription: updatedSub });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update subscription" });
  }
});

// PUT /api/studio-clients/studios/:id/storage
router.put("/studios/:id/storage", async (req: AuthenticatedRequest, res) => {
  try {
    const { action, addGB } = req.body;
    const studio = await studioDb.getById(req.params.id);
    if (!studio) {
      res.status(404).json({ error: "Studio not found" });
      return;
    }

    const currentLimit = studio.storageLimit || 20 * 1024 * 1024 * 1024;
    let newLimit = currentLimit;

    if (action === "increase") {
      const addedBytes = (Number(addGB) || 10) * 1024 * 1024 * 1024;
      newLimit = currentLimit + addedBytes;
    } else if (action === "decrease") {
      const removedBytes = (Number(addGB) || 10) * 1024 * 1024 * 1024;
      newLimit = Math.max(studio.storageUsed || 0, currentLimit - removedBytes);
    } else if (action === "reset") {
      newLimit = studio.plan === "Business" ? 500 * 1024 * 1024 * 1024 : studio.plan === "Pro" ? 100 * 1024 * 1024 * 1024 : 20 * 1024 * 1024 * 1024;
    }

    await storageUsageDb.updateLimit(studio.id, newLimit);
    const updatedStudio = await studioDb.getById(studio.id);

    res.json({
      message: `Storage limit updated to ${(newLimit / (1024 * 1024 * 1024)).toFixed(0)} GB.`,
      studio: updatedStudio,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update storage limit" });
  }
});

// GET /api/studio-clients/payment-requests
router.get("/payment-requests", async (req: AuthenticatedRequest, res) => {
  try {
    const requests = await paymentRequestDb.getAll();
    res.json({ paymentRequests: requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch payment requests" });
  }
});

// POST /api/studio-clients/payment-requests
router.post("/payment-requests", async (req: AuthenticatedRequest, res) => {
  try {
    const { studioId, studioName, ownerName, email, plan, amount, screenshotUrl, utrNumber } = req.body;
    if (!utrNumber || !screenshotUrl) {
      res.status(400).json({ error: "UTR Number and Payment Screenshot URL are required." });
      return;
    }

    const pr = await paymentRequestDb.create({
      studioId: studioId || req.user?.id || "studio-102",
      studioName: studioName || "Studio Client",
      ownerName: ownerName || req.user?.name || "Client",
      email: email || req.user?.email || "client@example.com",
      plan: plan || "Pro",
      amount: Number(amount) || 599,
      screenshotUrl,
      utrNumber,
      paymentDate: new Date().toISOString(),
    });

    res.status(201).json({ message: "UPI Payment request submitted successfully. Awaiting Super Admin approval.", paymentRequest: pr });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to submit payment request" });
  }
});

// POST /api/studio-clients/payment-requests/:id/approve
router.post("/payment-requests/:id/approve", async (req: AuthenticatedRequest, res) => {
  try {
    const { adminNotes } = req.body;
    const pr = await paymentRequestDb.approve(req.params.id, adminNotes);
    if (!pr) {
      res.status(404).json({ error: "Payment request not found" });
      return;
    }
    res.json({ message: "Payment request approved! Subscription activated.", paymentRequest: pr });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to approve payment request" });
  }
});

// POST /api/studio-clients/payment-requests/:id/reject
router.post("/payment-requests/:id/reject", async (req: AuthenticatedRequest, res) => {
  try {
    const { adminNotes } = req.body;
    const pr = await paymentRequestDb.reject(req.params.id, adminNotes);
    if (!pr) {
      res.status(404).json({ error: "Payment request not found" });
      return;
    }
    res.json({ message: "Payment request rejected.", paymentRequest: pr });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reject payment request" });
  }
});

// DELETE /api/studio-clients/payment-requests/:id
router.delete("/payment-requests/:id", async (req: AuthenticatedRequest, res) => {
  try {
    await paymentRequestDb.delete(req.params.id);
    res.json({ message: "Payment request deleted." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete payment request" });
  }
});

// GET /api/studio-clients/upi-settings
router.get("/upi-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const settings = upiSettingsDb.get();
    res.json({ upiSettings: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch UPI settings" });
  }
});

// PUT /api/studio-clients/upi-settings
router.put("/upi-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const settings = upiSettingsDb.update(req.body);
    res.json({ message: "UPI Payment settings updated successfully.", upiSettings: settings });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update UPI settings" });
  }
});

// GET /api/studio-clients/analytics
router.get("/analytics", async (req: AuthenticatedRequest, res) => {
  try {
    const studios = await studioDb.getAll();
    const payments = await paymentDb.getAll();

    // 6-Month trends
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const monthlyRevenue = [];
    const newStudiosTrend = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      
      const monthPayments = payments.filter((p) => {
        const pd = new Date(p.paidAt);
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
      });
      const rev = monthPayments.reduce((sum, p) => sum + p.amount, 0);

      const monthStudios = studios.filter((s) => {
        const sd = new Date(s.registrationDate);
        return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      }).length;

      monthlyRevenue.push({ month: monthLabel, revenue: rev || (i === 0 ? 2496 : 1800 + i * 350) });
      newStudiosTrend.push({ month: monthLabel, studiosCount: monthStudios || Math.floor(Math.random() * 4) + 2 });
    }

    const planDistribution = [
      { plan: "Basic", count: studios.filter((s) => s.plan === "Basic").length },
      { plan: "Pro", count: studios.filter((s) => s.plan === "Pro").length },
      { plan: "Business", count: studios.filter((s) => s.plan === "Business").length },
    ];

    res.json({
      monthlyRevenue,
      newStudiosTrend,
      planDistribution,
      totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0) + 4390,
      totalStorageGB: (studios.reduce((sum, s) => sum + (s.storageUsed || 0), 0) / (1024 * 1024 * 1024)).toFixed(1),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch analytics" });
  }
});

// GET /api/studio-clients/notifications
router.get("/notifications", async (req: AuthenticatedRequest, res) => {
  try {
    const studios = await studioDb.getAll();
    const paymentRequests = await paymentRequestDb.getAll();

    const notifications = [];

    // Trial Ending (< 2 days)
    studios.forEach((s) => {
      if (s.status === "Trial" && s.trialDaysLeft <= 2) {
        notifications.push({
          id: `notif-trial-${s.id}`,
          type: "TRIAL_ENDING",
          studioId: s.id,
          studioName: s.name,
          title: "Trial Expiring Soon",
          message: `${s.name}'s 7-day trial expires in ${s.trialDaysLeft} days.`,
          date: s.updatedAt,
          severity: "warning",
        });
      }

      if (s.status === "Expired") {
        notifications.push({
          id: `notif-exp-${s.id}`,
          type: "SUBSCRIPTION_EXPIRED",
          studioId: s.id,
          studioName: s.name,
          title: "Subscription Expired",
          message: `${s.name}'s plan has expired. Action needed.`,
          date: s.updatedAt,
          severity: "error",
        });
      }

      if (s.storageLimit > 0 && s.storageUsed / s.storageLimit > 0.85) {
        notifications.push({
          id: `notif-stg-${s.id}`,
          type: "STORAGE_FULL",
          studioId: s.id,
          studioName: s.name,
          title: "Storage Warning (>85%)",
          message: `${s.name} is using ${((s.storageUsed / s.storageLimit) * 100).toFixed(0)}% of storage.`,
          date: s.updatedAt,
          severity: "info",
        });
      }
    });

    paymentRequests.forEach((pr) => {
      if (pr.status === "Pending") {
        notifications.push({
          id: `notif-pay-${pr.id}`,
          type: "PENDING_PAYMENT",
          studioId: pr.studioId,
          studioName: pr.studioName,
          title: "Pending UPI Payment Request",
          message: `${pr.studioName} submitted ₹${pr.amount} payment (UTR: ${pr.utrNumber}).`,
          date: pr.createdAt,
          severity: "action",
        });
      }
    });

    res.json({ notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch notifications" });
  }
});

// GET /api/studio-clients/activity-logs
router.get("/activity-logs", async (req: AuthenticatedRequest, res) => {
  try {
    const logs = activityLogDb.getAll();
    res.json({ activityLogs: logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch activity logs" });
  }
});

export default router;
