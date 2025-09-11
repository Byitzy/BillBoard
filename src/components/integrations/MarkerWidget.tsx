'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    markerConfig?: { project: string } & Record<string, unknown>;
  }
}

/**
 * Loads the Marker.io widget on the client when a project ID is provided.
 * Set `NEXT_PUBLIC_MARKERIO_PROJECT_ID` in your environment to enable.
 */
export default function MarkerWidget() {
  const projectId = process.env.NEXT_PUBLIC_MARKERIO_PROJECT_ID;

  useEffect(() => {
    if (!projectId) return;

    window.markerConfig = { project: projectId };

    const script = document.createElement('script');
    script.src = 'https://edge.marker.io/latest/shim.js';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup: remove script and config if we mounted it
      try {
        document.head.removeChild(script);
      } catch {
        // no-op
      }
      delete window.markerConfig;
    };
  }, [projectId]);

  return null;
}
