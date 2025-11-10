let mapsPromise: Promise<typeof google.maps> | null = null;

export function loadGoogleMaps(apiKey: string = (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string) || ""): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }
  if ((window as any).google && (window as any).google.maps) {
    return Promise.resolve((window as any).google.maps);
  }
  if (mapsPromise) return mapsPromise;
  if (!apiKey) {
    return Promise.reject(new Error("Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY"));
  }
  mapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-google-maps-loader]");
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).google.maps));
      existing.addEventListener("error", (e) => reject(e));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-maps-loader", "true");
    script.onload = () => {
      if ((window as any).google && (window as any).google.maps) {
        resolve((window as any).google.maps);
      } else {
        reject(new Error("Google Maps failed to initialize"));
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
  return mapsPromise;
}
