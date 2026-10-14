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