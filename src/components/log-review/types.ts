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
  schoolName: string;
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
  status: "SUBMITTED";
  submittedAt: string | null;
  formattedSubmittedAt: string | null;
  student: LogStudentView;
  attachments: LogAttachmentView[];
};

export type StudentOption = {
  id: string;
  name: string;
  schoolName?: string;
  divisionName?: string;
};
