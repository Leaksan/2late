export function OfflineBanner() {
  return (
    <div className="border-b border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-center text-sm text-yellow-800 dark:text-yellow-200" role="status">
      Hors ligne — les données affichées peuvent être périmées. Les envois sont désactivés.
    </div>
  );
}

export function OfflineBlocking({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <b className="text-title">Hors ligne</b>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">Vérifiez le réseau, puis réessayez. Vous n’avez pas été déconnecté.</p>
      <button className="mt-4 h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground" onClick={onRetry}>
        Réessayer
      </button>
    </div>
  );
}
