import { notFound } from "next/navigation";
import { ZafA2uTest } from "@/components/zaf-a2u-test";

export const dynamic = "force-dynamic";
export default function A2uTestPage() {
  if (process.env.PI_NETWORK !== "testnet") notFound();
  return <ZafA2uTest />;
}
