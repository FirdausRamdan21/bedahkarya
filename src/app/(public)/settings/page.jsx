import { redirect } from "next/navigation";
import SettingsView from "@/components/SettingsView";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/settings");
  }

  return <SettingsView initialUser={user} />;
}

