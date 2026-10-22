import { Waves } from 'lucide-react';

/** Full-screen loader shown while /api/mhw is loading. */
export function LoadingScreen() {
  return (
    <div role="status" aria-live="polite" className="h-dvh w-full bg-sky-50 flex flex-col items-center justify-center space-y-6 px-4 text-center">
      <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin motion-reduce:animate-none shadow-lg" aria-hidden="true"></div>
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-sky-900 mb-2 flex items-center justify-center gap-2">
          <Waves className="w-6 h-6 text-sky-600" />
          Camarine
        </h1>
        <p className="text-sm text-slate-500 font-medium animate-pulse">Extraction et mise en cache des données Copernicus...</p>
      </div>
    </div>
  );
}
