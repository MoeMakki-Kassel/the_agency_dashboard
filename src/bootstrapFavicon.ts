/** Set document favicon from platform settings (logo_url). Non-blocking; failures ignored. */
export async function bootstrapFavicon(apiBase: string | undefined): Promise<void> {
  if (!apiBase) return;
  const base = String(apiBase).replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/settings/public`);
    if (!res.ok) return;
    const data = (await res.json()) as { logo_url?: string | null };
    if (!data?.logo_url) return;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = data.logo_url;
  } catch {
    /* keep default favicon from index.html */
  }
}
