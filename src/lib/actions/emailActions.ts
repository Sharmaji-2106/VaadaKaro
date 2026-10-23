"use server";

import nodemailer from "nodemailer";
import prisma from "@/lib/prisma";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Generate a unique reference mail ID: VDK-DEPT-YEAR-XXXXXXXX
 */
function generateReferenceId(department: string) {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `VDK-${department.toUpperCase().substring(0, 4)}-${year}-${random}`;
}

export async function sendComplaintConfirmationEmail(complaintId: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { citizen: true },
  });

  if (!complaint || !complaint.citizen.email) return;

  const mailOptions = {
    from: `"VaadaKaro" <${process.env.SMTP_USER}>`,
    to: complaint.citizen.email,
    subject: `Complaint Tracking ID: ${complaint.trackingId}`,
    html: `
      <h1>Grievance Received</h1>
      <p>Dear ${complaint.citizen.name},</p>
      <p>We have received your grievance regarding <strong>${complaint.title}</strong>.</p>
      <p><strong>Tracking ID:</strong> ${complaint.trackingId}</p>
      <p>You can track the progress of your complaint on the VaadaKaro portal.</p>
      <hr />
      <p>Regards,<br />VaadaKaro Team</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Confirmation email sent to ${complaint.citizen.email}`);
  } catch (error) {
    console.error("Error sending confirmation email:", error);
  }
}

export async function sendComplaintToGovernment(complaintId: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { citizen: true },
  });

  if (!complaint) return;

  const deptEmailKey = `GOVT_EMAIL_${complaint.department.toUpperCase().replace(/\s+/g, '_')}`;
  const govtEmail = process.env[deptEmailKey] || process.env.GOVT_EMAIL_GENERAL;

  if (!govtEmail) {
    console.warn(`No government email found for department: ${complaint.department}`);
    return;
  }

  const referenceId = generateReferenceId(complaint.department);

  const mailOptions = {
    from: `"VaadaKaro Portal" <${process.env.SMTP_USER}>`,
    to: govtEmail,
    subject: `Grievance Report: ${referenceId} - ${complaint.category}`,
    html: `
      <h2>VaadaKaro Official Grievance Report</h2>
      <p><strong>Reference ID:</strong> ${referenceId}</p>
      <p><strong>Department:</strong> ${complaint.department}</p>
      <p><strong>Category:</strong> ${complaint.category}</p>
      <p><strong>Citizen Name:</strong> ${complaint.citizen.name}</p>
      <p><strong>Location:</strong> ${complaint.location} (${complaint.pincode})</p>
      <hr />
      <h3>Complaint Details</h3>
      <p>${complaint.description}</p>
      <hr />
      <p><em>This is an automated grievance report from the VaadaKaro platform. Please respond to the citizen within the mandated timeframe.</em></p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Government notification sent to ${govtEmail} | Ref: ${referenceId}`);
  } catch (error) {
    console.error("Error sending government notification:", error);
  }
}
