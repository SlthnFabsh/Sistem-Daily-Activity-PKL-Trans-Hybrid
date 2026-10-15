import { hash } from "bcryptjs";
import { prisma } from "../src/lib/db";
import {
  PlacementStatus,
  Role,
} from "../src/generated/prisma/client";

// Seed contoh: 1 HRD, 2 divisi, 2 pembimbing, 3 siswa, 1 periode, penempatan.
// Idempotent (aman dijalankan ulang) dan menolak berjalan di production.

const SEED_PASSWORD = "Pkl@2026";

const SUPERADMIN_EMAIL = "superadmin@transhybrid.com";
const HRD_EMAIL = "hrd@transhybrid.com";
const MENTOR_1_EMAIL = "pembimbing1@transhybrid.com";
const MENTOR_2_EMAIL = "pembimbing2@transhybrid.com";
const STUDENT_1_EMAIL = "siswa1@transhybrid.com";
const STUDENT_2_EMAIL = "siswa2@transhybrid.com";
const STUDENT_3_EMAIL = "siswa3@transhybrid.com";

const PERIOD_ID = "periode-pkl-2026-2027";
const PERIOD_NAME = "Periode PKL 2026/2027";
const PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const PERIOD_END = new Date("2027-06-30T00:00:00.000Z");

const DIVISION_1 = "Divisi Operasional";
const DIVISION_2 = "Divisi Administrasi";

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Seed tidak boleh dijalankan di lingkungan production. Hapus atau ubah password akun seed terlebih dahulu."
    );
  }

  const passwordHash = await hash(SEED_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: HRD_EMAIL },
    update: { passwordHash },
    create: {
      email: HRD_EMAIL,
      name: "Dinda Putri",
      passwordHash,
      role: Role.HRD,
    },
  });

  await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    update: { passwordHash },
    create: {
      email: SUPERADMIN_EMAIL,
      name: "Superadmin",
      passwordHash,
      role: Role.SUPERADMIN,
    },
  });

  const division1 = await prisma.division.upsert({
    where: { name: DIVISION_1 },
    update: {},
    create: { name: DIVISION_1 },
  });
  const division2 = await prisma.division.upsert({
    where: { name: DIVISION_2 },
    update: {},
    create: { name: DIVISION_2 },
  });

  const mentor1User = await prisma.user.upsert({
    where: { email: MENTOR_1_EMAIL },
    update: { passwordHash },
    create: {
      email: MENTOR_1_EMAIL,
      name: "Budi Santoso",
      passwordHash,
      role: Role.MENTOR,
    },
  });
  await prisma.mentor.upsert({
    where: { userId: mentor1User.id },
    update: { divisionId: division1.id, isPic: true },
    create: { userId: mentor1User.id, divisionId: division1.id, isPic: true },
  });

  const mentor2User = await prisma.user.upsert({
    where: { email: MENTOR_2_EMAIL },
    update: { passwordHash },
    create: {
      email: MENTOR_2_EMAIL,
      name: "Sari Wulandari",
      passwordHash,
      role: Role.MENTOR,
    },
  });
  await prisma.mentor.upsert({
    where: { userId: mentor2User.id },
    update: { divisionId: division2.id, isPic: true },
    create: { userId: mentor2User.id, divisionId: division2.id, isPic: true },
  });

  const period = await prisma.pklPeriod.upsert({
    where: { id: PERIOD_ID },
    update: { name: PERIOD_NAME, startDate: PERIOD_START, endDate: PERIOD_END },
    create: {
      id: PERIOD_ID,
      name: PERIOD_NAME,
      startDate: PERIOD_START,
      endDate: PERIOD_END,
    },
  });

  const students = [
    {
      email: STUDENT_1_EMAIL,
      name: "Andi Pratama",
      nis: "2024-001",
      schoolName: "SMK Negeri 1 Jakarta",
      major: "Teknik Jaringan Komputer",
      className: "XI TJKT 1",
      phone: "081200000001",
      divisionId: division1.id,
      workStart: "08:00",
      workEnd: "16:00",
    },
    {
      email: STUDENT_2_EMAIL,
      name: "Bunga Lestari",
      nis: "2024-002",
      schoolName: "SMK Negeri 2 Bandung",
      major: "Otomatisasi Perkantoran",
      className: "XI OTKP 2",
      phone: "081200000002",
      divisionId: division2.id,
      workStart: "08:00",
      workEnd: "16:00",
    },
    {
      email: STUDENT_3_EMAIL,
      name: "Citra Dewi",
      nis: "2024-003",
      schoolName: "SMK Persada Jakarta",
      major: "Multimedia",
      className: "XII MM 3",
      phone: "081200000003",
      divisionId: division1.id,
      workStart: "08:30",
      workEnd: "17:00",
    },
  ];

  for (const s of students) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash },
      create: {
        email: s.email,
        name: s.name,
        passwordHash,
        role: Role.STUDENT,
      },
    });

    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {
        nis: s.nis,
        schoolName: s.schoolName,
        major: s.major,
        className: s.className,
        phone: s.phone,
      },
      create: {
        userId: user.id,
        nis: s.nis,
        schoolName: s.schoolName,
        major: s.major,
        className: s.className,
        phone: s.phone,
      },
    });

    await prisma.placement.upsert({
      where: {
        studentId_periodId: { studentId: student.id, periodId: period.id },
      },
      update: {
        divisionId: s.divisionId,
        workStart: s.workStart,
        workEnd: s.workEnd,
        status: PlacementStatus.ACTIVE,
      },
      create: {
        studentId: student.id,
        periodId: period.id,
        divisionId: s.divisionId,
        workStart: s.workStart,
        workEnd: s.workEnd,
      },
    });
  }

  console.log(
    "Seed selesai. Semua akun contoh memakai password sementara:",
    SEED_PASSWORD
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Gagal menjalankan seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });