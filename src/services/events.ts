// Typed subscriptions to Rust -> frontend events (contracts/ipc-events.md).
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { z } from "zod";
import {
  ExternalChangeEventSchema,
  MenuActionEventSchema,
  OpenFilesEventSchema,
  RejectedFilesEventSchema,
} from "./contracts";

function subscribe<T>(name: string, schema: z.ZodType<T>, handler: (payload: T) => void) {
  return listen<unknown>(name, (e) => {
    const parsed = schema.safeParse(e.payload);
    if (parsed.success) handler(parsed.data);
    else console.error(`Ignoring malformed event ${name}`, parsed.error);
  });
}

export const events = {
  onOpenFiles: (h: (p: z.infer<typeof OpenFilesEventSchema>) => void): Promise<UnlistenFn> =>
    subscribe("app://open-files", OpenFilesEventSchema, h),
  onRejectedFiles: (h: (p: z.infer<typeof RejectedFilesEventSchema>) => void): Promise<UnlistenFn> =>
    subscribe("app://rejected-files", RejectedFilesEventSchema, h),
  onExternalChange: (h: (p: z.infer<typeof ExternalChangeEventSchema>) => void): Promise<UnlistenFn> =>
    subscribe("fs://external-change", ExternalChangeEventSchema, h),
  onCloseRequested: (h: () => void): Promise<UnlistenFn> =>
    subscribe("app://close-requested", z.object({}).passthrough(), () => h()),
  onMenuAction: (h: (p: z.infer<typeof MenuActionEventSchema>) => void): Promise<UnlistenFn> =>
    subscribe("menu://action", MenuActionEventSchema, h),
};
