import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

type Handler = (args: Record<string, unknown> | undefined) => unknown | Promise<unknown>;

/** Registers fake Tauri commands; unknown commands reject like the real IPC does. */
export function installMockIpc(handlers: Record<string, Handler>) {
  const calls: { cmd: string; args?: Record<string, unknown> }[] = [];
  mockIPC((cmd, args) => {
    calls.push({ cmd, args: args as Record<string, unknown> | undefined });
    const h = handlers[cmd];
    if (!h) return Promise.reject({ code: "INVALID_ARGUMENT", message: `no handler for ${cmd}` });
    return h(args as Record<string, unknown> | undefined);
  });
  return { calls, restore: () => clearMocks() };
}
