/**
 * Haversine Formula for high-accuracy distance calculation on Earth's surface.
 * Computes distance in meters between two (latitude, longitude) coordinate pairs.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Determine if a check-in time exceeds official resumption cutoff time (e.g. 08:00 AM).
 */
export function isLateCheckIn(
  checkInDate: Date,
  cutoffTimeStr: string = '08:00'
): boolean {
  const [cutoffHours, cutoffMinutes] = cutoffTimeStr.split(':').map((v) => parseInt(v, 10));
  const checkInHours = checkInDate.getHours();
  const checkInMinutes = checkInDate.getMinutes();

  if (checkInHours > cutoffHours) return true;
  if (checkInHours === cutoffHours && checkInMinutes > cutoffMinutes) return true;
  return false;
}
