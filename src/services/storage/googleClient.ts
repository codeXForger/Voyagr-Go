import type { GoogleAuthPicker } from "./GoogleDriveStorage";

/* eslint-disable @typescript-eslint/no-explicit-any */
const SCOPE = "https://www.googleapis.com/auth/drive.file";

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });

export const isDriveConfigured = () => Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

/** Google Identity Services token flow + Google Picker, loaded lazily in the browser. */
export class BrowserGoogleClient implements GoogleAuthPicker {
  private token?: { value: string; expires: number };

  async getAccessToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 30_000) return this.token.value;
    await loadScript("https://accounts.google.com/gsi/client");
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      const client = google.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: SCOPE,
        callback: (r: any) => {
          if (r.error) return reject(new Error(r.error));
          this.token = { value: r.access_token, expires: Date.now() + Number(r.expires_in) * 1000 };
          resolve(r.access_token);
        },
        error_callback: (e: any) => reject(new Error(e?.type ?? "auth_failed")),
      });
      client.requestAccessToken();
    });
  }

  async pickFile(accessToken: string): Promise<string | null> {
    await loadScript("https://apis.google.com/js/api.js");
    await new Promise<void>((res) => (window as any).gapi.load("picker", () => res()));
    const g = (window as any).google.picker;
    return new Promise((resolve) => {
      const view = new g.DocsView().setMimeTypes("application/json").setQuery(".voyagr");
      new g.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(process.env.NEXT_PUBLIC_GOOGLE_API_KEY)
        .setAppId(process.env.NEXT_PUBLIC_GOOGLE_APP_ID)
        .setCallback((d: any) => {
          if (d.action === g.Action.PICKED) resolve(d.docs[0].id);
          else if (d.action === g.Action.CANCEL) resolve(null);
        })
        .build()
        .setVisible(true);
    });
  }
}
