"use client";
import { ZafRecovery } from "@/components/zaf-recovery";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="en"><body style={{ margin: 24, background: "#f7f8fa", color: "#242833", fontFamily: "Arial, sans-serif" }}><ZafRecovery reset={reset} /></body></html>;
}
