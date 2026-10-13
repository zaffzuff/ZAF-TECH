import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEcosystemSnapshot } from "@/lib/zaf/ecosystem";
import { toDirectoryApp } from "@/lib/zaf/app-directory";
import { AppDetails } from "@/components/zaf-app-details";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const snapshot = await getEcosystemSnapshot();
  const app = snapshot.apps.items.map((item) => toDirectoryApp(item, snapshot.generatedAt)).find((item) => item.slug === slug);
  return { title: app ? `${app.name} — ZAF Tech` : "App — ZAF Tech" };
}

export default async function EcosystemAppPage({ params }: Props) {
  const { slug } = await params;
  const snapshot = await getEcosystemSnapshot();
  const app = snapshot.apps.items.map((item) => toDirectoryApp(item, snapshot.generatedAt)).find((item) => item.slug === slug);
  if (!app) notFound();

  return <AppDetails app={app} />;
}
