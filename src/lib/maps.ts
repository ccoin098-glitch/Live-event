/** Build a Google Maps URL that prefers real venue/address over rough coordinates. */
export function googleMapsUrl(input: {
  venue?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  cityHint?: string | null;
}): string | null {
  const venue = input.venue?.trim() || "";
  const address = input.address?.trim() || "";
  const city = input.cityHint?.trim() || "";

  const textQuery = [venue, address]
    .filter(Boolean)
    .filter((part, i, arr) => {
      // Drop address if it's basically the same as venue
      if (i > 0 && arr[0] && part.toLowerCase().includes(arr[0].toLowerCase())) {
        return part.length > arr[0].length + 8;
      }
      return true;
    })
    .join(", ");

  let query = textQuery;
  if (query && city && !query.toLowerCase().includes(city.split(",")[0]!.trim().toLowerCase())) {
    query = `${query}, ${city}`;
  }

  if (query) {
    // maps.google.com tends to open the Google Maps app on phones.
    return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
  }

  if (
    input.lat != null &&
    input.lng != null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lng) &&
    !(input.lat === 0 && input.lng === 0)
  ) {
    return `https://maps.google.com/?q=${input.lat},${input.lng}`;
  }

  return null;
}
