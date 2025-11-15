// Utility functions for geolocation and reverse geocoding
// This module handles converting coordinates to readable location names

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

/**
 * Reverse geocode coordinates to get readable address using Google Maps Geocoding API
 * Falls back to Open Street Map if Google Maps key is not available
 */
export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number
): Promise<LocationData> {
  try {
    // Try Google Maps first if API key is available
    if (GOOGLE_MAPS_API_KEY) {
      return await googleMapsReverseGeocode(latitude, longitude);
    } else {
      // Fall back to OpenStreetMap Nominatim (free, no API key needed)
      return await nominatimReverseGeocode(latitude, longitude);
    }
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
    // Return coordinates as fallback
    return {
      latitude,
      longitude,
      address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
    };
  }
}

/**
 * Use Google Maps Geocoding API for reverse geocoding
 */
async function googleMapsReverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Google Maps API error");

  const data = await response.json();

  if (data.results && data.results.length > 0) {
    const result = data.results[0];
    const addressComponents = result.address_components;

    // Extract city and country from address components
    let city = "";
    let country = "";

    for (const component of addressComponents) {
      if (component.types.includes("locality")) {
        city = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
      }
    }

    return {
      latitude,
      longitude,
      address: result.formatted_address,
      city,
      country,
    };
  }

  throw new Error("No results from Google Maps");
}

/**
 * Use OpenStreetMap Nominatim API for reverse geocoding (free alternative)
 */
async function nominatimReverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationData> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Nominatim API error");

  const data = await response.json();

  if (data.address) {
    const address = data.address;
    // Build a readable address from components
    const parts = [];

    // Prefer specific location names
    if (address.shop) parts.push(address.shop);
    if (address.building) parts.push(address.building);
    if (address.leisure) parts.push(address.leisure);
    if (address.amenity) parts.push(address.amenity);

    // Add street info if available
    if (address.road) parts.push(address.road);

    // Add area/suburb
    if (address.suburb) parts.push(address.suburb);
    else if (address.neighbourhood) parts.push(address.neighbourhood);

    // Add city
    if (address.city) parts.push(address.city);
    else if (address.town) parts.push(address.town);
    else if (address.county) parts.push(address.county);

    const formattedAddress =
      parts.length > 0 ? parts.join(", ") : data.display_name;

    return {
      latitude,
      longitude,
      address: formattedAddress,
      city: address.city || address.town || "",
      country: address.country || "",
    };
  }

  throw new Error("No results from Nominatim");
}

/**
 * Generate map URL for opening in Maps application
 */
export function getMapUrl(
  latitude: number,
  longitude: number,
  address?: string
): string {
  // Google Maps URL
  const encodedAddress = address ? encodeURIComponent(address) : "";
  return `https://www.google.com/maps/search/${encodedAddress || latitude + "," + longitude}`;
}

/**
 * Get Apple Maps URL (for iOS/macOS)
 */
export function getAppleMapsUrl(
  latitude: number,
  longitude: number,
  address?: string
): string {
  return `http://maps.apple.com/?ll=${latitude},${longitude}&q=${address ? encodeURIComponent(address) : "Location"}`;
}

/**
 * Detect if user is on iOS/macOS for Apple Maps, otherwise use Google Maps
 */
export function getPreferredMapUrl(
  latitude: number,
  longitude: number,
  address?: string
): string {
  const isApple = /iPad|iPhone|iPod|Mac/.test(navigator.userAgent);
  return isApple
    ? getAppleMapsUrl(latitude, longitude, address)
    : getMapUrl(latitude, longitude, address);
}
