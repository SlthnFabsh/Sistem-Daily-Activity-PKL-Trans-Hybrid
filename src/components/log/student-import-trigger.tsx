"use client";

import { useState } from "react";
import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogImportModal } from "@/components/log/log-import-modal";
import { importStudentLogs } from "@/app/(app)/student/log/actions";

export function StudentImportTrigger() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(true)}
        className="text-xs"
      >
        <FileUp className="h-4 w-4" /> Impor Log dari Excel
      </Button>

      {isOpen && (
        <LogImportModal
          action={importStudentLogs}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
