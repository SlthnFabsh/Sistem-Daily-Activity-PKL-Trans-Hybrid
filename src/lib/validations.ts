import { z } from "zod";

// Skema validasi zod untuk seluruh input HRD. Pesan error dalam Bahasa Indonesia.

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} maksimal ${max} karakter.`)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

export const divisionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama divisi wajib diisi (minimal 2 karakter).")
    .max(50, "Nama divisi maksimal 50 karakter."),
});

export const periodSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama periode wajib diisi.")
      .max(100, "Nama periode maksimal 100 karakter."),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal mulai tidak valid."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal selesai tidak valid."),
  })
  .superRefine((value, ctx) => {
    const start = new Date(`${value.startDate}T00:00:00.000Z`);
    const end = new Date(`${value.endDate}T00:00:00.000Z`);
    if (end < start) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
      });
    }
  });

const personFields = {
  name: z
    .string()
    .trim()
    .min(2, "Nama wajib diisi (minimal 2 karakter).")
    .max(100, "Nama maksimal 100 karakter."),
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
};

export const mentorSchema = z.object({
  ...personFields,
  divisionId: z.string().min(1, "Divisi wajib dipilih."),
  isPic: z.boolean().optional(),
});

export const studentSchema = z.object({
  ...personFields,
  schoolName: z
    .string()
    .trim()
    .min(2, "Sekolah wajib diisi.")
    .max(150, "Nama sekolah maksimal 150 karakter."),
  nis: optionalText(30, "NIS"),
  major: optionalText(60, "Jurusan"),
  className: optionalText(30, "Kelas"),
  phone: optionalText(20, "Telepon"),
});

// Skema yang sama dipakai untuk impor Excel.
export const importRowSchema = studentSchema;

// Absensi: Izin/Sakit wajib menyertakan keterangan.
export const leaveSchema = z.object({
  status: z.enum(["IZIN", "SAKIT"], { message: "Pilih Izin atau Sakit." }),
  note: z
    .string()
    .trim()
    .min(1, "Keterangan wajib diisi.")
    .max(500, "Keterangan maksimal 500 karakter."),
});

export const placementSchema = z
  .object({
    studentId: z.string().min(1, "Siswa wajib dipilih."),
    periodId: z.string().min(1, "Periode wajib dipilih."),
    divisionId: z.string().min(1, "Divisi wajib dipilih."),
    workStart: z.string().regex(timeRegex, "Format jam harus HH:MM (mis. 08:00)."),
    workEnd: z.string().regex(timeRegex, "Format jam harus HH:MM (mis. 16:00)."),
    status: z.enum(["ACTIVE", "FINISHED"]),
  })
  .superRefine((value, ctx) => {
    if (value.workEnd <= value.workStart) {
      ctx.addIssue({
        code: "custom",
        path: ["workEnd"],
        message: "Jam pulang harus setelah jam masuk.",
      });
    }
  });

// Log aktivitas: field wajib tanggal, jam mulai, jam selesai, taskFrom, uraian.
export const activityLogSchema = z
  .object({
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid."),
    startTime: z.string().regex(timeRegex, "Format jam mulai harus HH:MM."),
    endTime: z.string().regex(timeRegex, "Format jam selesai harus HH:MM."),
    taskFrom: z
      .string()
      .trim()
      .min(2, "Pemberi tugas wajib diisi.")
      .max(100, "Pemberi tugas maksimal 100 karakter."),
    description: z
      .string()
      .trim()
      .min(5, "Uraian kegiatan wajib diisi (minimal 5 karakter).")
      .max(2000, "Uraian maksimal 2000 karakter."),
    output: optionalText(1000, "Hasil"),
    obstacle: optionalText(1000, "Hambatan"),
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Jam selesai harus setelah jam mulai.",
      });
    }
  });

// Skema untuk baris impor Excel log aktivitas
export const importLogRowSchema = z
  .object({
    logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid."),
    startTime: z.string().regex(timeRegex, "Format jam mulai harus HH:MM.").default("08:00"),
    endTime: z.string().regex(timeRegex, "Format jam selesai harus HH:MM.").default("16:00"),
    taskFrom: z
      .string()
      .trim()
      .min(2, "Pemberi tugas wajib diisi.")
      .max(100, "Pemberi tugas maksimal 100 karakter."),
    description: z
      .string()
      .trim()
      .min(3, "Uraian kegiatan wajib diisi (minimal 3 karakter).")
      .max(2000, "Uraian maksimal 2000 karakter."),
    output: optionalText(1000, "Hasil"),
    obstacle: optionalText(1000, "Hambatan"),
  })
  .superRefine((value, ctx) => {
    if (value.endTime <= value.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Jam selesai harus setelah jam mulai.",
      });
    }
  });

// Skema ganti password oleh pengguna sendiri.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .max(128, "Password baru maksimal 128 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });

// Skema permintaan reset password (oleh pengguna non-superadmin).
export const requestResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid."),
});

// Skema penetapan ulang password oleh superadmin (memakai token).
export const setPasswordSchema = z
  .object({
    token: z.string().min(1, "Token wajib diisi."),
    newPassword: z
      .string()
      .min(8, "Password baru minimal 8 karakter.")
      .max(128, "Password baru maksimal 128 karakter."),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  });