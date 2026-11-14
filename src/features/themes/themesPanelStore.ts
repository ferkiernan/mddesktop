// Open/close state of the Temas panel (spec 004).
import { create } from "zustand";

export const useThemesPanel = create<{ open: boolean }>(() => ({ open: false }));
export const openThemesPanel = () => useThemesPanel.setState({ open: true });
export const closeThemesPanel = () => useThemesPanel.setState({ open: false });
