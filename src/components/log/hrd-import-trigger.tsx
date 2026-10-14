"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LogImportModal,
  type StudentOptionForImport,
} from "@/components/log/log-import-modal";
import { importStudentLogsByHrd } from "@/app/(app)/hrd/log/actions";

export function HrdImportTrigger({
  students,
}: {
  students: StudentOptionForImport[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        <FileUp className="h-4 w-4" /> Impor Log Siswa
      </Button>

      {isOpen && (
        <LogImportModal
          action={importStudentLogsByHrd}
          students={students}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
