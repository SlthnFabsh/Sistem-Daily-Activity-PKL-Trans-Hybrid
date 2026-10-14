// Store pending global untuk indikator "Memproses...".
//
// Dipakai di sisi client saja. Setiap kali ada server action atau proses
// unggah yang berjalan, penghitung dinaikkan sehingga overlay global tampil
// otomatis tanpa harus dipasang di setiap form.

// Modul ini hanya boleh diimport dari client component.
let pendingCount = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

/** Tandai ada proses yang sedang berjalan. */
export function startPending() {
  pendingCount += 1;
  notify();
}

/** Tandai proses selesai. Tidak bisa turun di bawah nol. */
export function endPending() {
  pendingCount = Math.max(0, pendingCount - 1);
  notify();
}

/** Snapshot untuk useSyncExternalStore: true bila ada proses berjalan. */
export function getPending() {
  return pendingCount > 0;
}

/** Berlangganan perubahan status pending. */
export function subscribePending(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}