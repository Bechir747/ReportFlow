export enum UserRole {
  ADMIN = "ADMIN",
  DEPOSITOR = "DEPOSITOR",
  APPROVER = "APPROVER",
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string | null;
  activation_date: string;
  reminder_date: string;
  due_date: string;
  is_active: boolean;
  depositor_id: string;
  approver_id: string | null;
  current_version_id: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  report_id: string;
  version_id: string | null;
  author_id: string;
  parent_comment_id: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
