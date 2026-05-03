import { supabase } from "@/integrations/supabase/client";

export interface AppSettings {
  login_background_url: string | null;
  favicon_url: string | null;
  logo_url: string | null;
  logo_size: number;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const { data } = await (supabase as any)
    .from("app_settings")
    .select("login_background_url, favicon_url, logo_url, logo_size")
    .eq("id", true)
    .maybeSingle();
  return {
    login_background_url: data?.login_background_url ?? null,
    favicon_url: data?.favicon_url ?? null,
    logo_url: data?.logo_url ?? null,
    logo_size: data?.logo_size ?? 44,
  };
}

export function applyFavicon(url: string | null) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}
