export function announce(message: string) {
  const el = document.getElementById("live");
  if (el) el.textContent = message;
}
