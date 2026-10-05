import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type ExportResult = { uri: string; shared: boolean };

function exportsDir(): Directory {
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function safeName(filename: string, ext: string): string {
  const base = filename.replace(/\.[a-z0-9]+$/i, '').replace(/[^\w\- ]+/g, '').trim() || 'timesheet';
  return `${base}.${ext}`;
}

async function share(uri: string, mimeType: string, UTI: string, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle });
  return true;
}

/** Writes `text` (e.g. shared `toCsv(...)` output) to `<filename>.csv` and opens the share sheet. */
export async function exportCsv(text: string, filename: string): Promise<ExportResult> {
  const file = new File(exportsDir(), safeName(filename, 'csv'));
  if (file.exists) file.delete();
  file.create();
  // BOM so Excel opens UTF-8 (accents in client names) correctly.
  file.write(`﻿${text}`);
  const shared = await share(file.uri, 'text/csv', 'public.comma-separated-values-text', 'Share timesheet (CSV)');
  return { uri: file.uri, shared };
}

/** Renders `html` to a PDF named `<filename>.pdf` and opens the share sheet. */
export async function exportPdf(html: string, filename: string): Promise<ExportResult> {
  const { uri: tmpUri } = await Print.printToFileAsync({ html });
  const tmp = new File(tmpUri);
  const dest = new File(exportsDir(), safeName(filename, 'pdf'));
  if (dest.exists) dest.delete();
  tmp.moveSync(dest);
  const shared = await share(dest.uri, 'application/pdf', 'com.adobe.pdf', 'Share timesheet (PDF)');
  return { uri: dest.uri, shared };
}
