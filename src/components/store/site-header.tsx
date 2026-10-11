import { redirect } from "next/navigation";

import { SiteHeaderClient } from "@/components/store/site-header-client";
import { getStoreSettings } from "@/lib/settings/store-settings";

export async function SiteHeader() {
  const settings = await getStoreSettings();

  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <SiteHeaderClient
      businessName={settings.businessName}
      brandByline={settings.brandByline}
      announcementEnabled={settings.announcementEnabled}
      announcementText={settings.announcementText}
    />
  );
}
