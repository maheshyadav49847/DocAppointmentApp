# Implementation Walkthrough — Hospital Queue Management System

This document outlines the step-by-step development plan following Clean Architecture (.NET) and Feature-Based Architecture (React).

## Phase 1: Foundation & Project Setup

### 1.1 Backend Setup (.NET Clean Architecture)
We will create a Solution with 4 projects:
1. **`CodeX.Domain`**: Entities, Enums, and Value Objects.
2. **`CodeX.Application`**: MediatR Commands/Queries, DTOs, and Interfaces.
3. **`CodeX.Infrastructure`**: EF Core DbContext, Migrations, and External Services (WhatsApp/SMS).
4. **`CodeX.Api`**: Controllers, Middleware, and SignalR Hubs.

### 1.2 Frontend Setup (React + Vite + TS)
- Initialize React with Vite and TypeScript.
- Setup folder structure: `src/features`, `src/components`, `src/hooks`, `src/services`.
- Install TailwindCSS/Vanilla CSS and basic routing.

---

## Phase 2: Database & Core Domain

- Define the entities (Hospitals, Branches, Doctors, Sessions, Tokens) in the `Domain` layer.
- Configure Entity Framework Core and PostgreSQL in the `Infrastructure` layer.
- Execute initial migrations to create the "Industry-Grade" schema.

---

## Phase 3: Identity & Management (CRUD)

- **Auth**: Implement JWT-based authentication for Staff (Receptionists/Admins).
- **CRUD**: Build APIs for:
  - Branch Management.
  - Doctor Management.
  - Session Scheduling (Dynamic timings).

---

## Phase 4: The Queue Engine

- **MediatR**: Use Command/Query separation for token operations.
- **SignalR**: Implement a `QueueHub` so the dashboard updates instantly when a token is generated or called.
- **Logic**: Sequential token generation and status transition (`Pending` -> `Called` -> `Completed`).

---

## Phase 5: WhatsApp Integration & Alerts

- **Webhooks**: Create an endpoint to receive messages from Wati/Interakt.
- **Notification Service**: A background worker or service to send proactive alerts (Doctor Arrived, 3-tokens away).
- **Fallback**: Implement SMS logic if the WhatsApp API call fails.

---

## Phase 6: Frontend Development

- **Auth Flow**: Login for staff.
- **Admin Panel**: CRUD UI for Doctors and Sessions.
- **Receptionist Dashboard**: The real-time queue management screen (Next, Skip, Doctor Arrived buttons).
- **Feedback UI**: Small page/bot-flow for patient ratings.

---

## Phase 7: Deployment & Polishing

- Dockerize the application.
- Final testing of fail-safe mechanisms (Internet/API down).
- UI/UX polish (Animations and Dark Mode).
