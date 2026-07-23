import { jsPDF } from "jspdf";
import { WeddingCrewBooking, WeddingEventSection, CrewMemberAssignment, PdfTemplateType } from "../types/weddingCrew.js";

interface StudioSettings {
  studioName?: string;
  studioLogo?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  address?: string;
}

export function generateCrewAssignmentPdf({
  booking,
  events,
  event,
  crew,
  template = "template-1",
  settings = {},
}: {
  booking: WeddingCrewBooking;
  events?: WeddingEventSection[];
  event?: WeddingEventSection;
  crew: Partial<CrewMemberAssignment> & { name: string; role: string; phone: string };
  template?: PdfTemplateType;
  settings?: StudioSettings;
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const assignedEvents: WeddingEventSection[] =
    events && events.length > 0
      ? events
      : event
      ? [event]
      : booking.events && booking.events.length > 0
      ? booking.events
      : [
          {
            id: "default-evt",
            eventName: booking.event || "Wedding Event",
            eventDate: booking.eventDate || "N/A",
            venue: booking.venue || "N/A",
            googleMapsLink: "",
            crewAssignments: [],
          },
        ];

  const studioTitle = settings.studioName || "LUXURY WEDDING PHOTOGRAPHY";
  const emergencyPhone = settings.emergencyContact || settings.phone || "+91 98300 00000";
  const studioEmail = settings.email || "crew@studioworkspace.com";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (template === "template-1") {
    // TEMPLATE 1: Modern Elegant
    // Navy & Gold Banner
    doc.setFillColor(18, 24, 38); // Dark Navy
    doc.rect(0, 0, pageWidth, 35, "F");

    doc.setFillColor(212, 175, 55); // Gold Accent
    doc.rect(0, 35, pageWidth, 2, "F");

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(studioTitle.toUpperCase(), 15, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 205, 215);
    doc.text("CONSOLIDATED CREW ASSIGNMENT ORDER", 15, 24);

    doc.setTextColor(212, 175, 55);
    doc.setFontSize(8);
    doc.text(`REF: ${booking.id.substring(0, 12).toUpperCase()}`, pageWidth - 15, 16, { align: "right" });
    doc.text(`ISSUED: ${new Date().toLocaleDateString()}`, pageWidth - 15, 24, { align: "right" });

    let y = 48;

    // Crew Member Highlight Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, y, pageWidth - 30, 32, 3, 3, "FD");

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(crew.name, 22, y + 10);

    doc.setFillColor(212, 175, 55);
    doc.roundedRect(22, y + 14, 55, 6, 1, 1, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text((crew.role || "CREW MEMBER").toUpperCase(), 24, y + 18.5);

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Phone: ${crew.phone}`, 90, y + 10);
    doc.text(`WhatsApp: ${crew.whatsappNumber || crew.phone}`, 90, y + 16);
    doc.text(`Email: ${crew.email || "N/A"}`, 90, y + 22);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`Total Honorarium: ₹${Number(crew.payment || 0).toLocaleString("en-IN")}`, pageWidth - 25, y + 12, { align: "right" });
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(`Status: ${crew.status || "Assigned"}`, pageWidth - 25, y + 20, { align: "right" });

    y += 42;

    // Section 1: Assignment Overview
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(18, 24, 38);
    doc.text("ASSIGNMENT OVERVIEW", 15, y);
    doc.setLineWidth(0.4);
    doc.setDrawColor(203, 213, 225);
    doc.line(15, y + 2, pageWidth - 15, y + 2);

    y += 8;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const clientRows = [
      ["Wedding Side:", booking.weddingSide || "Both Side", "Booking Status:", booking.status || "Pending"],
      ["Primary Event:", booking.event || "Wedding Assignment", "Primary Date:", booking.eventDate || "N/A"],
      ["City:", booking.city || "N/A", "Assigned Events Count:", `${assignedEvents.length} Event(s)`],
    ];

    clientRows.forEach((row) => {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(row[0], 15, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(row[1], 42, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text(row[2], 105, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(row[3], 148, y);

      y += 7;
    });

    y += 6;

    // Section 2: Assigned Events Schedule
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(18, 24, 38);
    doc.text("ASSIGNED EVENTS SCHEDULE", 15, y);
    doc.line(15, y + 2, pageWidth - 15, y + 2);

    y += 8;

    assignedEvents.forEach((evt, idx) => {
      if (y > pageHeight - 50) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, y, pageWidth - 30, 36, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(212, 175, 55);
      doc.text(`${idx + 1}. ${evt.eventName.toUpperCase()}`, 20, y + 9);

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`Date: ${evt.eventDate || "TBD"}`, pageWidth - 20, y + 9, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(`Venue: ${evt.venue || booking.venue || "To be confirmed"}`, 20, y + 17);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(37, 99, 235);
      doc.text(`Google Maps Link: ${evt.googleMapsLink || "N/A"}`, 20, y + 25);

      if (evt.notes) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(`Note: ${evt.notes}`, 20, y + 31);
      }

      y += 42;
    });

    // Section 3: Special Notes & Instructions
    if (booking.notes || crew.notes) {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(18, 24, 38);
      doc.text("ASSIGNMENT NOTES & INSTRUCTIONS", 15, y);
      doc.line(15, y + 2, pageWidth - 15, y + 2);

      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const noteText = [
        crew.notes ? `Crew Note: ${crew.notes}` : "",
        booking.notes ? `General Booking Note: ${booking.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const splitNotes = doc.splitTextToSize(noteText, pageWidth - 30);
      doc.text(splitNotes, 15, y);

      y += splitNotes.length * 5 + 6;
    }

    // Emergency Contact & Footer
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(15, pageHeight - 38, pageWidth - 30, 20, 2, 2, "FD");

    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("EMERGENCY CONTACT & COORDINATION", 20, pageHeight - 31);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(127, 29, 29);
    doc.text(`Studio Dispatch Line: ${emergencyPhone}  |  Email: ${studioEmail}`, 20, pageHeight - 24);
    doc.text("Please report to venue 30 minutes prior to event commencement. Keep backups formatted.", 20, pageHeight - 20);

  } else if (template === "template-2") {
    // TEMPLATE 2: Minimalist Slate
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(studioTitle, 15, 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("CONSOLIDATED CREW DUTY DEPLOYMENT SLIP", 15, 21);

    doc.text(`ID: ${booking.id.substring(0, 10).toUpperCase()}`, pageWidth - 15, 18, { align: "right" });

    let y = 38;

    // Grid Card for Crew
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(255, 255, 255);
    doc.rect(15, y, pageWidth - 30, 30, "D");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(crew.name, 20, y + 9);

    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`ASSIGNED ROLE: ${(crew.role || "CREW").toUpperCase()}`, 20, y + 16);
    doc.text(`CONTACT: ${crew.phone} | WA: ${crew.whatsappNumber || "N/A"}`, 20, y + 23);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAL HONORARIUM: ₹${Number(crew.payment || 0).toLocaleString("en-IN")}`, pageWidth - 20, y + 12, { align: "right" });

    y += 38;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ASSIGNED EVENTS", 15, y);
    y += 6;

    assignedEvents.forEach((evt) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(15, y, pageWidth - 30, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`EVENT: ${evt.eventName}`, 20, y + 8);
      doc.text(`DATE: ${evt.eventDate || "TBD"}`, pageWidth - 20, y + 8, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`Venue: ${evt.venue || booking.venue || "N/A"}, ${booking.city || "N/A"}`, 20, y + 16);
      doc.text(`Maps Link: ${evt.googleMapsLink || "N/A"}`, 20, y + 22);

      y += 34;
    });

    if (booking.notes || crew.notes) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("INSTRUCTIONS", 15, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(crew.notes || booking.notes || "Standard crew operating procedures apply.", 15, y);
      y += 12;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emergency Helpline: ${emergencyPhone} | ${studioEmail}`, 15, pageHeight - 18);

  } else {
    // TEMPLATE 3: Luxury Gold/Classic
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(0.8);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
    doc.setLineWidth(0.2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(studioTitle, pageWidth / 2, 22, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(160, 120, 40);
    doc.text("Official Crew Assignment Voucher", pageWidth / 2, 28, { align: "center" });

    doc.setDrawColor(212, 175, 55);
    doc.line(30, 31, pageWidth - 30, 31);

    let y = 42;

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`Crew Member: ${crew.name}`, 15, y);
    doc.text(`Role: ${crew.role || "Crew"}`, pageWidth - 15, y, { align: "right" });

    y += 8;

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Phone: ${crew.phone}  |  WhatsApp: ${crew.whatsappNumber || crew.phone}`, 15, y);
    doc.text(`Total Fee: ₹${Number(crew.payment || 0).toLocaleString("en-IN")}`, pageWidth - 15, y, { align: "right" });

    y += 12;

    assignedEvents.forEach((evt, idx) => {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(250, 248, 240);
      doc.setDrawColor(212, 175, 55);
      doc.roundedRect(15, y, pageWidth - 30, 32, 2, 2, "FD");

      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(140, 100, 20);
      doc.text(`${idx + 1}. EVENT: ${evt.eventName.toUpperCase()}`, 20, y + 9);
      doc.text(`DATE: ${evt.eventDate || "TBD"}`, pageWidth - 20, y + 9, { align: "right" });

      doc.setFont("times", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`Venue: ${evt.venue || booking.venue || "N/A"}, ${booking.city || "N/A"}`, 20, y + 18);
      doc.text(`Location Link: ${evt.googleMapsLink || "N/A"}`, 20, y + 25);

      y += 38;
    });

    if (booking.notes || crew.notes) {
      if (y > pageHeight - 40) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text("Special Assignment Directives:", 15, y);
      y += 6;
      doc.setFont("times", "italic");
      doc.setFontSize(9.5);
      doc.text(crew.notes || booking.notes || "Ensure high-resolution deliverables and punctual arrival.", 15, y);
      y += 14;
    }

    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(140, 100, 20);
    doc.text(`Emergency Support Hotline: ${emergencyPhone}`, pageWidth / 2, pageHeight - 20, { align: "center" });
  }

  return doc;
}
