import { LocationResult } from "@/types";

export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export async function validateLocation(
  restaurantLat: number,
  restaurantLon: number,
  allowedRadiusMeters: number
): Promise<LocationResult> {
  try {
    const position = await getCurrentLocation();
    const { latitude, longitude, accuracy } = position.coords;

    if (accuracy > 200) {
      return {
        verified: false,
        distanceMeters: 0,
        accuracyMeters: accuracy,
        reason: "POOR_ACCURACY",
      };
    }

    const distance = calculateDistance(latitude, longitude, restaurantLat, restaurantLon);
    const effectiveDistance = Math.max(0, distance - accuracy);

    return {
      verified: effectiveDistance <= allowedRadiusMeters,
      distanceMeters: Math.round(distance),
      accuracyMeters: Math.round(accuracy),
      reason: effectiveDistance > allowedRadiusMeters ? "OUTSIDE_RADIUS" : undefined,
    };
  } catch (err: unknown) {
    const error = err as GeolocationPositionError | Error;
    const code = "code" in error ? error.code : 0;
    const reason =
      code === 1 ? "PERMISSION_DENIED" :
      code === 2 ? "POSITION_UNAVAILABLE" :
      code === 3 ? "TIMEOUT" : "UNKNOWN";
    return { verified: false, distanceMeters: 0, accuracyMeters: 0, reason };
  }
}
