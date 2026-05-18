import { Geolocation } from "@capacitor/geolocation";

export type LocationCoordinates = {
  lat: number;
  lng: number;
};

export async function getCurrentLocation(): Promise<LocationCoordinates> {
  try {
    // Vérifier et demander les permissions
    const permission = await Geolocation.checkPermissions();

    if (permission.location === "denied") {
      await Geolocation.requestPermissions();
    }

    // Récupérer la position actuelle
    const coordinates = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    });

    return {
      lat: coordinates.coords.latitude,
      lng: coordinates.coords.longitude,
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "Impossible de récupérer la position GPS.",
    );
  }
}
