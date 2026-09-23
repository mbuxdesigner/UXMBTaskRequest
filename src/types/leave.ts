/**
 * Types cho module Quản lý Lịch nghỉ phép nhân sự (Team Leaves)
 * Tích hợp từ Google Sheet ngoài: 1oeDjaIMIuDsG2bDG2HT8euLICVXxQvWpf-2jfDr3Vlg (gid: 917777763)
 */

export type LeaveType = 'full_day' | 'morning' | 'afternoon' | 'half_day';

export interface UserLeaveRecord {
  id: string;
  date: string;              // DD/MM/YYYY (ví dụ: "26/05/2026")
  iso_date: string;          // YYYY-MM-DD (ví dụ: "2026-05-26")
  leave_type: LeaveType;     // 'full_day' | 'morning' | 'afternoon' | 'half_day'
  leave_type_raw: string;    // "Nghỉ nguyên ngày", "Nghỉ nửa ngày (chiều)"
  reason: string;            // "e xin nghỉ: du lịch", "việc cá nhân"
  user_name?: string;        // "Dương Mạnh Cường"
  email: string;             // "cuongdm5@mbbank.com.vn" (Cột G Mail MB)
  synced_at?: string;
}

export interface UnifiedOperationalData {
  status: string;
  total_requests: number;
  total_members: number;
  total_leaves: number;
  requests: any[];
  members: any[];
  leaves: UserLeaveRecord[];
  master_data?: any;
  timestamp: string;
}
