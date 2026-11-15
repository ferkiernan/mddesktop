// The only module that calls Tauri commands. Components must go through this layer.
import { invoke } from "@tauri-apps/api/core";
import { z } from "zod";
import {
  FileFingerprintSchema,
  ImportResultSchema,
  WriteExportResultSchema,
  type ExportFormat,
  PreferencesSchema,
  ReadResultSchema,
  RecoveryEntrySchema,
  SessionSchema,
  StatResultSchema,
  WriteRequestSchema,
  type Preferences,
  type ReadResult,
  type RecoveryEntry,
  type Session,
  type WriteRequest,
  type FileFingerprint,
  CustomStyleSchema,
  LoadedStylesSchema,
  type CustomStyle,
} from "./contracts";
import { toAppError } from "./errors";

async function call<T>(
  command: string,
  schema: z.ZodType<T>,
  args?: Record<string, unknown>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await invoke(command, args);
  } catch (e) {
    throw toAppError(e);
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw toAppError({ code: "IO", message: `Invalid response from ${command}` });
  }
  return parsed.data;
}

const Void = z.null().or(z.undefined());
const Paths = z.array(z.string());

export const documents = {
  pickOpenFiles: () => call("pick_open_files", Paths),
  read: (path: string, acceptLarge = false) =>
    call<ReadResult>("read_document", ReadResultSchema, { path, acceptLarge }),
  pickSavePath: (suggestedName: string, directory?: string) =>
    call("pick_save_path", z.string().nullable(), { suggestedName, directory }),
  write: (request: WriteRequest): Promise<{ fingerprint: FileFingerprint }> =>
    call("write_document", z.object({ fingerprint: FileFingerprintSchema }), {
      request: WriteRequestSchema.parse(request),
    }),
  stat: (path: string) => call("stat_document", StatResultSchema, { path }),
  watch: (paths: string[]) => call("watch_documents", Void, { paths }),
};

export const session = {
  load: () => call<Session | null>("session_load", SessionSchema.nullable()),
  save: (s: Session) => call("session_save", Void, { session: SessionSchema.parse(s) }),
  recoveryWrite: (entry: RecoveryEntry) =>
    call("recovery_write", Void, { entry: RecoveryEntrySchema.parse(entry) }),
  recoveryList: () => call("recovery_list", z.array(RecoveryEntrySchema)),
  recoveryDelete: (documentId: string) => call("recovery_delete", Void, { documentId }),
};

export const settings = {
  load: () => call<Preferences>("settings_load", PreferencesSchema),
  save: (patch: Partial<Preferences>) => call<Preferences>("settings_save", PreferencesSchema, { patch }),
};

export const stylesIpc = {
  load: () => call("styles_load", LoadedStylesSchema),
  save: (styles: CustomStyle[]) => call("styles_save", z.array(CustomStyleSchema), { styles: styles.map((s) => CustomStyleSchema.parse(s)) }),
};

export const app = {
  confirmExit: () => call("confirm_exit", Void),
  getLaunchFiles: () => call("get_launch_files", Paths),
  setStyleMenu: (style: string) => call("set_style_menu", Void, { style }),
  setViewMenu: (toolbar: boolean, history: boolean) => call("set_view_menu", Void, { toolbar, history }),
  openAboutLink: (which: "project" | "library" | "author") => call("open_about_link", Void, { which }),
  setCustomStylesMenu: (items: [string, string][], active: string) => call("set_custom_styles_menu", Void, { items, active }),
};

export const images = {
  pick: () => call("pick_image", z.string().nullable()),
  import: (documentPath: string, sourcePath: string, overwrite = false) =>
    call("import_image", ImportResultSchema, { documentPath, sourcePath, overwrite }),
};

export const exports_ = {
  /** Native save dialog for an export; null when the user cancels. */
  pickPath: (format: ExportFormat, suggestedName: string, directory?: string) =>
    call("pick_export_path", z.string().nullable(), { format, suggestedName, directory }),
  write: (path: string, dataBase64: string) => call("write_export", WriteExportResultSchema, { path, dataBase64 }),
};
