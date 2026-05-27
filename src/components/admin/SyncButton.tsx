"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function SyncButton() {
  const router = useRouter();

  async function sync() {
    await fetch("/api/sync/statuses", { method: "POST" });
    router.refresh();
  }

  return (
    <button className="button primary" type="button" onClick={sync}>
      <RefreshCw size={18} aria-hidden />
      Запустить sync
    </button>
  );
}
