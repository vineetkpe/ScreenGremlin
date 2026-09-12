export {}

declare global {
  interface Window {
    screenGremlin?: {
      setInteractive: (interactive: boolean) => void
    }
  }
}
