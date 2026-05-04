# UI Design & Failure Handling Logic

This document details the user interface for the receptionist and the strategy for handling system failures.

## 1. Receptionist Dashboard UI Components

The dashboard is the "Control Center" for the branch. It must be fast, real-time, and easy to use under pressure.

### 1.1 Main Navigation
- **Branch Switcher**: (For Branch Admins) to toggle between different buildings/floors.
- **Doctor Dashboard**: The primary view, filtered by the selected doctor.

### 1.2 Doctor's Queue View
- **Status Header**:
  - Doctor Name & Specialization.
  - Active Session Name (e.g., "Morning").
  - **Start Session / Doctor Arrived Button**: Triggers the broadcast alert.
  - **Pause/Resume Button**: For emergency breaks.
- **Live Counter**:
  - **NOW SERVING**: Displays the current token number in a large, high-contrast font.
  - **NEXT UP**: Displays the next 2-3 tokens.
- **Patient Table**:
  - `Token #` | `Patient Name` | `Wait Time` | `Source` (WA/Manual) | `Arrival Status`
  - **Actions per Patient**: "Mark Arrived", "Skip", "Complete Consultation".

### 1.3 Manual Token Entry (Walk-ins & Phone Calls)
- A quick-action form accessible at all times (not just during failure).
- **Use Cases**: 
  - Patient calls the hospital directly.
  - Patient walks into the reception.
  - WhatsApp API is down.
- **Fields**: Name, Phone Number, Doctor, Session, **Source** (Dropdown: WhatsApp, Phone, Walk-in).
- **Action**: Generates the next sequential token number and marks the patient as "Physically Present" or "Remote" based on the entry.

---

## 2. Failure Handling Strategy

Reliability is non-negotiable in healthcare.

### 2.1 WhatsApp API Failure (Wati/Interakt Down)
- **Automatic SMS Fallback**: If the WA API returns a non-200 response or a timeout, the backend automatically attempts to send the notification via **SMS (Twilio/Msg91)**.
- **Dashboard Notification**: A prominent alert banner appears: *"WhatsApp Service is currently unavailable. Switched to SMS notifications."*

### 2.2 Internet Connectivity Failure
- **Local Cache**: The dashboard (React) will maintain a local state of the queue.
- **Offline Operations**: Receptionist can still click "Next" and manage the queue. The actions are queued locally and synced back to the database once the connection is restored.
- **Manual Calling**: If internet is down, patients won't receive alerts. The receptionist must rely on physical calling or a local TV display (if available).

### 2.3 Database Downtime
- **Read-Only Mode**: If the DB is in maintenance, the dashboard shows the last known state.
- **Manual Log**: Receptionists are trained to keep a physical log sheet as a last resort backup.

## 3. Security & Access Control
- **Auto-Logout**: Sessions expire after 12 hours of inactivity.
- **Role-Based Views**: Receptionists cannot see financial settings or delete doctors; Admins have full CRUD access.
