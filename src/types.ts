/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = "super_admin" | "admin";

export interface AppUser {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  created_at?: string;
}

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_name: string;
  project_name: string;
  bug_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
}

export interface BugRecord {
  id?: string;
  created_at?: string;
  no: number | string;
  sectionName: string;
  projectName: string;
  typeTesting: string;
  discoveryDate: string | null;
  type: "Bug" | "Change Request" | string;
  severity: "Recurring" | "Critical" | "Major" | "Minor" | "Trivia" | string;
  includedInFsd: "Ya" | "Tidak" | string;
  remarks: string;
  screenshot: string;
  statusPic: string;
  devName: string;
  startDate: string | null;
  finishAt: string | null; // "Finish Date"
  responseDev: string;
  statusDev: string;
  sitRealizedDate: string | null; // "(SIT) Realized in Date"
  periode: string;
  picName?: string;
  // Calculated fields
  bugScore: number;
  total_score: number;
  // Audit Meta
  last_edited_by?: string;
  last_edited_at?: string;
  last_updated?: string | null;
  // Soft Delete Meta
  is_deleted?: boolean;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface DevEvaluation {
  dev_name: string;
  notes: string;
}

export interface DevStats {
  devName: string;
  totalScore: number;
  bugCount: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  triviaCount: number;
  recurringCount: number;
  evaluationNotes?: string;
}

export const SEVERITY_WEIGHTS: Record<string, number> = {
  Recurring: 6,
  Critical: 5,
  Major: 3,
  Minor: 1,
  Trivia: 0.5,
};
