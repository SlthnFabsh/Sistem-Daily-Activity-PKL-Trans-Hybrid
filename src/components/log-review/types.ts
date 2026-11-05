export type LogAttachmentView = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  formattedSize: string;
};

export type LogStudentView = {
  id: string;
  name: string;
  nis: string | null;
  schoolName: string | null;
  className: string | null;
  major: string | null;
  divisionName: string;
};

export type LogReviewItem = {
  id: string;
  logDate: string;
  formattedDate: string;
  startTime: string;
  endTime: string;
  taskFrom: string;
  description: string;
  output: string | null;
  obstacle: string | null;
  status: "SUBMITTED" | "PENDING_REVIEW" | "APPROVED";
  submittedAt: string | null;
  formattedSubmittedAt: string | null;
  approvedAt?: string | null;
  isOverdue?: boolean; // Menunggu persetujuan lebih dari 7 hari
  student: LogStudentView;
  attachments: LogAttachmentView[];
};

export type StudentOption = {
  id: string;
  name: string;
  schoolName?: string | null;
  divisionName?: string;
};
