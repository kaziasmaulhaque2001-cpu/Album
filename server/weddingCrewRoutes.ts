import { Router, Response } from "express";
import { authMiddleware, AuthenticatedRequest } from "./authMiddleware.js";
import { weddingCrewDb } from "./weddingCrewDb.js";

const router = Router();

// GET all wedding crew bookings
router.get("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const bookings = await weddingCrewDb.getAll();
    res.json(bookings);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch wedding crew bookings" });
  }
});

// GET single wedding crew booking
router.get("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const booking = await weddingCrewDb.getById(req.params.id);
    if (!booking) {
      res.status(404).json({ error: "Wedding crew booking not found" });
      return;
    }
    res.json(booking);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch booking" });
  }
});

// POST create new wedding crew booking
router.post("/", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { weddingSide, event, eventDate, venue, city, notes, status, events, clientName, brideName, bridePhone, brideFamilyContact, groomName, groomPhone, groomFamilyContact } = req.body;

  if (!event || !eventDate) {
    res.status(400).json({ error: "Event and Event Date are required fields." });
    return;
  }

  try {
    const newBooking = await weddingCrewDb.create({
      weddingSide: weddingSide || "Both Side",
      event: (event || "Wedding Event").trim(),
      eventDate: (eventDate || "").trim(),
      venue: (venue || "").trim(),
      city: (city || "").trim(),
      notes: (notes || "").trim(),
      status: status || "Pending",
      clientName: (clientName || "").trim(),
      brideName: (brideName || "").trim(),
      bridePhone: (bridePhone || "").trim(),
      brideFamilyContact: (brideFamilyContact || "").trim(),
      groomName: (groomName || "").trim(),
      groomPhone: (groomPhone || "").trim(),
      groomFamilyContact: (groomFamilyContact || "").trim(),
      events: Array.isArray(events) ? events : [],
    });

    res.status(201).json(newBooking);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create booking" });
  }
});

// PUT update wedding crew booking
router.put("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await weddingCrewDb.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update booking" });
  }
});

// DELETE wedding crew booking
router.delete("/:id", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await weddingCrewDb.delete(req.params.id);
    if (!success) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    res.json({ message: "Booking deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete booking" });
  }
});

export default router;
