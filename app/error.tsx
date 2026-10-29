"use client";
import { ZafRecovery } from "@/components/zaf-recovery";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <ZafRecovery reset={reset} />;
}
