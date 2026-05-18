import { useCallback } from "react";
import { getCurrentLocation } from "../services/geolocation";

export function useGeolocation(
  onSuccess: (lat: number, lng: number) => void,
  onError: (message: string) => void,
) {
  return useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      onSuccess(location.lat, location.lng);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Impossible de récupérer la position GPS.",
      );
    }
  }, [onSuccess, onError]);
}
