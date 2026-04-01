/**
 * Platform adapter for Electron-only APIs.
 * Provides a platform-agnostic interface that gracefully degrades in web mode.
 */
export const platformAdapter = {
  /**
   * Get the absolute file path for a File object (Electron only).
   * Returns null in web environments where this API is unavailable.
   */
  getPathForFile(file: File): string | null {
    try {
      if (window.electronAPI?.getPathForFile) {
        return window.electronAPI.getPathForFile(file)
      }
    } catch {
      // Ignore errors from Electron API
    }
    return null
  },

  /** Check if running in Electron desktop environment. */
  isElectron(): boolean {
    return typeof window !== 'undefined' && Boolean((window as { electronAPI?: unknown }).electronAPI)
  },
}
