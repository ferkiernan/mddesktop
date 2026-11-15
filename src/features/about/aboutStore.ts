// Open/close state of the About dialog (spec 011).
import { create } from "zustand";

export const useAbout = create<{ open: boolean }>(() => ({ open: false }));
export const openAbout = () => useAbout.setState({ open: true });
export const closeAbout = () => useAbout.setState({ open: false });
