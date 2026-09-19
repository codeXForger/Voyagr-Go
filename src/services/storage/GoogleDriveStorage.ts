import type { Trip } from "@/domain/types";
import { deserializeTrip, fileNameFor, serializeTrip } from "./serialization";
import type { TripStorage } from "./TripStorage";

/** Browser-only pieces (OAuth + Picker) injected so the storage logic is testable. */
export interface GoogleAuthPicker {
  getAccessToken(): Promise<string>;
  /** Returns the chosen Drive file id, or null when cancelled. */
  pickFile(accessToken: string): Promise<string | null>;
}

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";
const FOLDER = "Voyagr-Go";
const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Adapter over the Drive REST API using the `drive.file` scope. */
export class GoogleDriveStorage implements TripStorage {
  readonly name = "Google Drive";
  private fileIds = new Map<string, string>();
  private folderId?: string;

  constructor(
    private readonly auth: GoogleAuthPicker,
    private readonly http: typeof fetch = (...a) => fetch(...a),
  ) {}

  async save(trip: Trip): Promise<void> {
    const token = await this.auth.getAccessToken();
    const existing = this.fileIds.get(trip.id);
    const body = serializeTrip(trip);
    if (existing) {
      await this.call(`${UPLOAD}/files/${existing}?uploadType=media`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      return;
    }
    const parent = await this.ensureFolder(token);
    const boundary = "voyagr" + Math.random().toString(36).slice(2);
    const meta = { name: fileNameFor(trip), parents: [parent], mimeType: "application/json" };
    const multipart =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n--${boundary}--`;
    const created = await this.call(`${UPLOAD}/files?uploadType=multipart&fields=id`, token, {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipart,
    });
    this.fileIds.set(trip.id, (await created.json()).id);
  }

  async open(): Promise<Trip | null> {
    const token = await this.auth.getAccessToken();
    const id = await this.auth.pickFile(token);
    if (!id) return null;
    const res = await this.call(`${API}/files/${id}?alt=media`, token);
    const trip = deserializeTrip(await res.text());
    this.fileIds.set(trip.id, id);
    return trip;
  }

  private async ensureFolder(token: string): Promise<string> {
    if (this.folderId) return this.folderId;
    const q = encodeURIComponent(`name='${FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    const found = await (await this.call(`${API}/files?q=${q}&fields=files(id)`, token)).json();
    if (found.files?.length) return (this.folderId = found.files[0].id);
    const created = await this.call(`${API}/files?fields=id`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: FOLDER, mimeType: FOLDER_MIME }),
    });
    return (this.folderId = (await created.json()).id);
  }

  private async call(url: string, token: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.http(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Google Drive request failed (${res.status})`);
    return res;
  }
}
