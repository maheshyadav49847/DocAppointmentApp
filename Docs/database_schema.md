# Industry-Grade Database Schema — Hospital Queue Management System

This document defines a production-ready PostgreSQL schema designed for multi-tenancy, high availability, and auditability.

## 1. Core Principles
- **Soft Deletes**: No critical data is physically deleted (`is_deleted` column).
- **Audit Trails**: Every table tracks creation and last update.
- **UUIDs**: All primary keys use UUID v4 for security and scalability.
- **Strict Constraints**: Extensive use of `NOT NULL`, `UNIQUE`, and `CHECK` constraints.

---

## 2. Global Columns (Common to all tables)
- `id`: UUID (PK, DEFAULT gen_random_uuid())
- `created_at`: TIMESTAMP (WITH TIME ZONE, DEFAULT now())
- `updated_at`: TIMESTAMP (WITH TIME ZONE, DEFAULT now())
- `is_active`: BOOLEAN (DEFAULT true)
- `is_deleted`: BOOLEAN (DEFAULT false)

---

## 3. Tables Definition

### 3.1 `organizations` (Top-level Tenants)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `name` | VARCHAR(255) | NOT NULL | Official name of the hospital group |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL-friendly name |
| `settings`| JSONB | | Global org settings (logos, branding) |

### 3.2 `branches`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `org_id` | UUID | FK -> organizations.id | Link to parent organization |
| `name` | VARCHAR(255) | NOT NULL | Branch location name |
| `address` | TEXT | | Full address |
| `whatsapp_number`| VARCHAR(20) | UNIQUE, NOT NULL | Format: 919876543210 |
| `wa_api_key` | TEXT | | Encrypted API key for WhatsApp |
| `timezone` | VARCHAR(50) | DEFAULT 'UTC' | Branch-specific timezone |

### 3.3 `doctors`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `branch_id` | UUID | FK -> branches.id | Branch where the doctor works |
| `name` | VARCHAR(255) | NOT NULL | Full Name |
| `specialization`| VARCHAR(100) | | e.g. "Cardiologist" |
| `reg_number` | VARCHAR(50) | UNIQUE | Medical Council registration number |

### 3.4 `staff` (RBAC)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `org_id` | UUID | FK -> organizations.id | For Org Admins |
| `branch_id` | UUID | FK -> branches.id | For Branch Admins/Receptionists |
| `email` | CITEXT | UNIQUE, NOT NULL | Case-insensitive email |
| `password_hash` | TEXT | NOT NULL | Argon2 or Bcrypt hash |
| `role` | ENUM | | `SUPER_ADMIN`, `ORG_ADMIN`, `BRANCH_ADMIN`, `RECEPTIONIST`, `DOCTOR` |

### 3.5 `patients`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | Primary key for bot identification |
| `name` | VARCHAR(255) | NOT NULL | Last used name |
| `meta_data` | JSONB | | Language preference, age, etc. |

### 3.6 `sessions` (Dynamic Schedule)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `doctor_id` | UUID | FK -> doctors.id | |
| `session_name` | VARCHAR(50) | | e.g. "Mon-Wed Morning" |
| `day_of_week` | SMALLINT | CHECK (0-6) | 0=Sunday, etc. |
| `start_time` | TIME | NOT NULL | Scheduled start |
| `end_time` | TIME | NOT NULL | Scheduled end |
| `capacity` | INTEGER | NOT NULL | Max tokens allowed |

### 3.7 `daily_queues` (Running Instance)
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `session_id` | UUID | FK -> sessions.id | |
| `queue_date` | DATE | NOT NULL | Date of the queue |
| `status` | ENUM | | `OPEN`, `ACTIVE`, `PAUSED`, `COMPLETED` |
| `actual_start_at`| TIMESTAMP | | When doctor arrived |
| `current_token` | INTEGER | DEFAULT 0 | Last called token |

### 3.8 `tokens`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `queue_id` | UUID | FK -> daily_queues.id | |
| `patient_id` | UUID | FK -> patients.id | |
| `token_number` | INTEGER | NOT NULL | Sequential for the day |
| `booking_source` | ENUM | | `WHATSAPP`, `PHONE`, `WALK_IN` |
| `status` | ENUM | | `PENDING`, `CALLED`, `COMPLETED`, `SKIPPED`, `CANCELLED` |
| `booked_at` | TIMESTAMP | DEFAULT now() | |
| `called_at` | TIMESTAMP | | |
| `completed_at` | TIMESTAMP | | |

### 3.9 `ratings`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `token_id` | UUID | UNIQUE, FK -> tokens.id | |
| `score` | SMALLINT | CHECK (1-5) | |
| `comment` | TEXT | | |

---

## 4. Key Improvements for Industry Standard
1. **Normalization**: Split `daily_queues` from `sessions` to handle date-specific states (like doctor arrival).
2. **Data Types**: Used `CITEXT` for emails and `JSONB` for flexibility.
3. **Auditability**: Every row tracks its lifecycle.
4. **Scalability**: UUIDs and proper FK indexing ensure the DB doesn't slow down as data grows.
