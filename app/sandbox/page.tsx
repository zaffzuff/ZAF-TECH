import { notFound } from "next/navigation";
import { ZafTechApp } from "@/components/zaf-tech-app";

export default function SandboxPage() {
  if (process.env.PI_NETWORK?.trim().toLowerCase() !== "testnet") notFound();
  return <ZafTechApp />;
}
