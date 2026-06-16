-- Migration: Add role column to users table
-- Allows role-based access control: "doctor" (dermatologist) or "secretary"

ALTER TABLE "users" ADD COLUMN "role" varchar DEFAULT 'doctor';

-- Index for faster role-based queries
CREATE INDEX "IDX_users_role" ON "users"("role");
