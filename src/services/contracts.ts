// Zod schemas mirroring specs/001-markdown-desktop-editor/contracts and data-model.md.
import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "NOT_AUTHORIZED",
  "NOT_FOUND",
  "PERMISSION_DENIED",
  "INVALID_ARGUMENT",
  "NOT_MARKDOWN",
  "TOO_LARGE",
  "ENCODING_UNDETECTABLE",
  "ENCODING_CONVERSION_REQUIRED",
  "EXTERNAL_CONFLICT",
  "DISK_FULL",
  "IO",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const AppErrorSchema = z.object({
  code: ErrorCodeSchema,
  message: z.string(),
  details: z.unknown().optional(),
});
export type AppErrorPayload = z.infer<typeof AppErrorSchema>;

export const EolSchema = z.enum(["lf", "crlf"]);
export type Eol = z.infer<typeof EolSchema>;

export const FileFingerprintSchema = z.object({
  mtimeMs: z.number().int().nonnegative(),
  size: z.number().int().nonnegative(),
  hash: z.string(),
});
export type FileFingerprint = z.infer<typeof FileFingerprintSchema>;

export const ReadResultSchema = z.object({
  path: z.string(),
  content: z.string(),
  encoding: z.string(),
  bom: z.boolean(),
  eol: EolSchema,
  fingerprint: FileFingerprintSchema,
});
export type ReadResult = z.infer<typeof ReadResultSchema>;

export const WriteRequestSchema = z.object({
  path: z.string(),
  content: z.string(),
  eol: EolSchema,
  bom: z.boolean(),
  encoding: z.string(),
  convertToUtf8: z.boolean().optional(),
  expectedFingerprint: FileFingerprintSchema.nullable(),
  overwriteExternal: z.boolean().optional(),
});
export type WriteRequest = z.infer<typeof WriteRequestSchema>;

export const StatResultSchema = z.object({
  exists: z.boolean(),
  fingerprint: FileFingerprintSchema.optional(),
});

export const PreferencesSchema = z.object({
  version: z.literal(1),
  theme: z.enum(["light", "dark"]),
  uiZoom: z.number().min(0.7).max(2),
  statusBarVisible: z.boolean(),
  lastDirectory: z.string().nullable(),
  editorPoolSize: z.number().int().min(1).max(8),
  largeFileWarnBytes: z.number().int().positive(),
  editorStyle: z.string().min(1).max(32),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const SessionTabSchema = z.object({
  documentId: z.string(),
  filePath: z.string().nullable(),
  fingerprint: FileFingerprintSchema.nullable(),
  hasRecovery: z.boolean(),
});
export const SessionSchema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  activeDocumentId: z.string().nullable(),
  tabs: z.array(SessionTabSchema),
});
export type Session = z.infer<typeof SessionSchema>;

export const RecoveryEntrySchema = z.object({
  documentId: z.string(),
  filePath: z.string().nullable(),
  baseFingerprint: FileFingerprintSchema.nullable(),
  eol: EolSchema,
  encoding: z.string(),
  bom: z.boolean(),
  writtenAt: z.number(),
  content: z.string(),
});
export type RecoveryEntry = z.infer<typeof RecoveryEntrySchema>;

// ---- events (contracts/ipc-events.md) ----
export const OpenFilesEventSchema = z.object({
  paths: z.array(z.string()),
  source: z.enum(["argv", "second-instance", "drop", "os"]),
});
export const RejectedFilesEventSchema = z.object({
  paths: z.array(z.string()),
  reason: z.literal("NOT_MARKDOWN"),
});
export const ExternalChangeEventSchema = z.object({
  path: z.string(),
  kind: z.enum(["modified", "removed", "renamed"]),
  fingerprint: FileFingerprintSchema.optional(),
});
const BaseMenuActionIdSchema = z.enum([
  "file.new",
  "file.open",
  "file.save",
  "file.saveAs",
  "file.close",
  "file.closeAll",
  "file.exit",
  "insert.image",
  "export.html",
  "export.pdf",
  "export.docx",
  "export.odt",
  "edit.undo",
  "edit.redo",
  "edit.cut",
  "edit.copy",
  "edit.paste",
  "edit.selectAll",
  "view.toggleTheme",
  "view.zoomIn",
  "view.zoomOut",
  "view.zoomReset",
  "view.toggleStatusBar",
  "tab.next",
  "tab.prev",
]);
/** Fixed actions plus one `style.<presetId>` action per editor style (Configuración menu). */
export const MenuActionIdSchema = BaseMenuActionIdSchema.or(z.string().regex(/^style\.[a-z0-9-]{1,32}$/));
export type MenuActionId = z.infer<typeof MenuActionIdSchema>;
export const MenuActionEventSchema = z.object({ id: MenuActionIdSchema });

export const ImportResultSchema = z.object({
  relativePath: z.string(),
  copied: z.boolean(),
  existedBefore: z.boolean(),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;

export const ExportFormatSchema = z.enum(["html", "pdf", "docx", "odt"]);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
export const WriteExportResultSchema = z.object({ bytes: z.number().int().nonnegative() });
