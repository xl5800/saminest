/**
 * Vite + TypeScript shadow entry.
 * The application is still bootstrapped by /legacy-app.js.
 */
const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);

if (isLocalDevelopment) {
  console.info("[Saminest] Vite + TypeScript shadow shell is ready.");
}
