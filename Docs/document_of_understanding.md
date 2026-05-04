# Document of Understanding (DoU)
## Hospital Queue Management System — MVP

**Version:** 2.0  
**Date:** 27 April 2026  
**Status:** Draft

---

## 1. Background & Problem Statement

Hospitals face a common operational problem where patients come in, register their name at the reception, and then leave the premises while waiting for their turn. Since there is no real-time notification system, patients often miss their token number when it is called. The receptionist attempts to call patients manually, but this is unreliable and leads to:

- Patients missing their turn
- Queue disruption and delays
- Frustration for both patients and hospital staff
- Inefficient use of receptionist's time

### Core Problem
> A patient registers their name, leaves the hospital premises, and has no way of knowing when their turn is approaching — leading to missed tokens and queue mismanagement.

---

## 2. Proposed Solution

A **WhatsApp-based Queue Management System** that allows patients to:
- Register for a token from home via WhatsApp
- Choose their preferred session (Morning or Evening)
- Track their queue position in real-time
- Receive smart alerts when their turn is approaching
- Never miss their token number

The receptionist gets a simple web dashboard to manage the queue. No app download is required by the patient — WhatsApp is the only interface.

---

## 3. Objectives

- Eliminate missed tokens due to patients being away from hospital
- Allow patients to register from home and arrive just in time
- Reduce manual effort of receptionist in calling patients
- Create a seamless experience for both new and returning patients
- Build a system that is robust, reliable, and scalable from day one

---

## 4. Doctor Sessions

Doctor sessions are **dynamic** and configured individually for each doctor within a branch. 

### Session Types
While most doctors follow a "Morning" and "Evening" pattern, the system supports any number of custom-timed sessions.

### Dynamic Booking Window
Each session has its own:
- **Start & End Time** (e.g., Dr. Sharma might be 10:00 AM – 12:30 PM)
- **Booking Start Time** (When the bot starts accepting tokens for that session)
- **Capacity** (Max tokens allowed for that specific session)

This flexibility allows the hospital to manage different doctors' schedules accurately.

---

## 5. Scope of MVP

### 5.1 In Scope

| # | Feature |
|---|---------|
| 1 | WhatsApp-based patient registration (new & returning) |
| 2 | Session selection — Morning or Evening |
| 3 | Auto token number generation per session |
| 4 | Dynamic capacity management per session |
| 5 | Real-time queue status via WhatsApp |
| 6 | Smart notifications (3 tokens away, final call, missed token) |
| 7 | Overflow handling — redirect to other session |
| 8 | Receptionist web dashboard with session toggle |
| 9 | Patient database with visit history |
| 10 | Multi-tenant architecture (multiple hospitals) |
| 11 | SMS fallback if WhatsApp message fails |
| 12 | Doctor-wise separate queues |
| 13 | Multi-branch management per hospital |
| 14 | Patient ratings and reviews |
| 15 | Multiple receptionist logins / role-based access |
| 16 | Doctor & Session Management (CRUD) for Admins |
| 17 | Manual Entry (Phone/Walk-in) for Receptionist |

### 5.2 Out of Scope (Post-MVP)

- Live queue display for TV/monitor
- Online payment / consultation fees
- Medical records or prescription history
- Advanced analytics and reports
- Video consultation


---

## 6. User Roles

| Role | Description |
|------|-------------|
| **Patient** | Registers via WhatsApp, tracks queue, receives alerts |
| **Receptionist** | Manages branch-specific queue via dashboard (Multiple per branch) |
| **Branch Admin** | Manages doctors, staff, and settings for a specific branch |
| **Hospital Admin** | Oversees all branches, doctors, and reports across the hospital |

---

## 7. Feature Details

### 7.1 Patient Registration via WhatsApp

**New Patient Flow:**
1. Patient sends "Hi" to hospital's WhatsApp number
2. Bot asks for name
3. Bot asks — *"Kaunse session mein aana chahte ho? Morning (11 AM – 1 PM) ya Evening (9 PM – 11 PM)?"*
4. Token is generated for selected session — *"Aapka Morning token #12 hai"*

**Returning Patient Flow:**
1. Patient sends "Hi"
2. System identifies patient by phone number
3. Bot asks — *"Kya aap [Name] hain?"*
4. Patient replies "Haan"
5. Bot asks session preference
6. Token instantly booked — *"Aapka Evening token #7 book ho gaya"*

> Phone number is the patient's identity. No login or password required.

---

### 7.2 Real-Time Queue Tracking

- Patient sends "Status" anytime
- Bot replies — *"Morning queue: Abhi #7 chal raha hai, aapka #12 hai, approx 30 min baaki"*
- Current token and estimated wait time always available on demand

---

### 7.3 Smart Notifications (WhatsApp Bot)

| Trigger | Message Sent |
|---------|-------------|
| Token booked | "Aapka Morning token #12 hai. Hum alert karenge jab number aane wala ho." |
| **Doctor Arrived** | "Dr. Sharma hospital pahunch gaye hain aur unhone session shuru kar diya hai." |
| 3 tokens away | "Aapka number jaldi aa raha hai. Please 15 min mein pahunch jao." |
| Token called | "Aapki baari aa gayi hai (#12). Kripya reception pe aayein." |
| Token missed (after 10 min) | "Aapka #12 skip ho gaya. Wapas queue mein aana chahte ho? Reply 'HAAN'" |
| Session full | "Morning session full hai. Kya Evening (9-11 PM) mein book karein? Reply 'HAAN'" |

---

### 7.4 Dynamic Capacity Management

Queue capacity is **not fixed** — it flexes based on real-time conditions.

**How it works:**

```
Default Capacity (set by admin)
          +
Real-time Override (by receptionist)
          =
Current Session Capacity
```

- Admin sets a **default capacity** per session (e.g., 20 tokens each)
- Receptionist can increase or decrease capacity anytime via dashboard +/- button
- System shows a **backlog warning** if queue is moving slower than expected
- System **suggests capacity increase** if queue is moving faster than expected

**Patient-facing:**
- While booking — *"Morning mein abhi 18/20 slots bhare hain"*
- When full — automatic redirect offered to other session

---

### 7.5 Overflow Handling

If a session reaches capacity:
1. New patients are informed — *"Morning session full hai"*
2. Bot automatically offers the other session — *"Kya Evening (9-11 PM) mein book karein?"*
3. Patient can accept or decline
4. If receptionist increases capacity later, waitlisted patients are notified

---

### 7.6 Receptionist Web Dashboard

- **Session toggle** — switch between Morning Queue and Evening Queue
- View current token number being served
- "Next Patient" button to advance queue
- Mark patient as absent / skip
- Re-add skipped patient back into queue
- See who is physically present vs. registered remotely
- **+/- Capacity button** to flex session limit in real-time
- Manual Reset button (emergency use)
- Works offline for basic queue management if internet is temporarily down

---

### 7.7 Queue Reset

| Type | Behaviour |
|------|-----------|
| Automatic | Both queues reset daily at 11:59 PM |
| Manual | Receptionist can reset anytime via dashboard (emergency) |

---

### 7.8 Patient Database

- Identified by phone number
- Stores: name, phone, session preference history, visit history, current token status
- Enables instant returning patient recognition
- No PII beyond name and phone number in MVP

---

## 8. Key Business Rules

| Rule | Decision |
|------|----------|
| Booking type | Same-day only (no future date booking in MVP) |
| Sessions per day | 2 — Morning (11 AM–1 PM) and Evening (9 PM–11 PM) |
| Missed patient timer | 10 minutes after "your turn" alert → auto skip |
| Queue reset | Automatic at 11:59 PM daily |
| Receptionist logins | Multiple with Role-Based Access Control (RBAC) |
| Default capacity | 20 tokens per session per doctor (configurable) |
| Capacity adjustment | Real-time by receptionist or doctor |
| Overflow | Redirect to other session/doctor via WhatsApp |

---

## 9. Technical Architecture

### 9.1 Design Principles

- **Backend: Clean Architecture**: Separation of concerns using Domain, Application, Infrastructure, and API layers.
- **Frontend: Feature-Based Architecture**: React code organized by features (e.g., `features/queue-management`) for better modularity.
- **Stateless Bot:** WhatsApp bot holds no state. All queue state lives in the database.
- **Database as Source of Truth:** Every action is persisted immediately.
- **Multi-Tenant from Day 1:** Every database record includes `org_id` and `branch_id`.
- **Fault Tolerant:** Automatic SMS fallback for WhatsApp message failures.
- **CQRS Pattern**: Using MediatR in .NET for clean command/query separation.

### 9.2 Recommended Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| WhatsApp API | Interakt / Wati | Hosted, reliable Business API |
| **Backend** | **.NET Core (C#)** | Enterprise-grade, fast, and secure |
| **Database** | **PostgreSQL** | Robust relational database |
| **Frontend** | **React + Vite (TypeScript)** | Fast development and type safety |
| **Real-time** | **SignalR** | For live dashboard updates |
| **ORM** | **Entity Framework Core** | Standard for .NET data access |
| SMS Fallback | Twilio / Msg91 | Reliability for notifications |

### 9.3 High-Level Architecture

```
Patient (WhatsApp)
       |
       v
WhatsApp Business API (Interakt/Wati)
       |
       v
Backend Server (Node.js / FastAPI)
       |
        +-----> PostgreSQL Database (Supabase)
        |             |
        |             +---> Hospitals & Branches Table
        |             +---> Doctors Table (per branch)
        |             +---> Patients Table
        |             +---> Sessions Table (per doctor)
        |             +---> Tokens Table (per session/doctor)
        |             +---> Staff Table (Logins & RBAC)
        |             +---> Queue Events Log
        |             +---> Patient Ratings Table
        |
        +-----> Receptionist Web Dashboard (React)
        |
        +-----> SMS Fallback (Twilio) [if WhatsApp fails]
```

---

## 10. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| **Uptime** | 99.5% during doctor session hours |
| **Message Delivery** | WhatsApp alert within 5 seconds of trigger |
| **Queue State Recovery** | Full recovery within 30 seconds of server restart |
| **Concurrent Users** | 50–200 patients per hospital per day (MVP) |
| **Data Retention** | Patient records retained for minimum 1 year |
| **Security** | Phone numbers stored securely, no unnecessary PII collected |

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| WhatsApp message not delivered | SMS fallback via Twilio |
| Patient doesn't respond to confirmation | Token auto-skips after 10 minutes |
| Receptionist internet goes down | Dashboard works offline for basic queue management |
| WhatsApp API downtime | Queue continues manually, notifications resume when API is back |
| Patient books token but never shows up | Skip + re-queue feature handles this |
| Session overflow | Automatic redirect to other session via WhatsApp |
| Doctor finishes early / late | Receptionist manually adjusts capacity in real-time |

---

## 12. Open Questions

- [ ] Should patients be able to cancel their token themselves via WhatsApp?
- [ ] What happens if doctor is absent for a day — who notifies patients and how?
- [ ] Should a patient be able to book both sessions in one day?

---

## 13. Next Steps

1. Review and finalize this DoU with all stakeholders
2. Resolve remaining open questions
3. Finalize WhatsApp API provider (Interakt / Wati)
4. Design database schema
5. Build and test WhatsApp bot flow
6. Build receptionist dashboard
7. Pilot with one hospital
8. Iterate and scale

---

*This document is a living document and will be updated as decisions are made and requirements evolve.*
