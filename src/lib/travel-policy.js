export function publishedTrips(trips) {
  return trips.filter((trip) => trip.data.published === true)
    .sort((a, b) => b.data.updatedAt.localeCompare(a.data.updatedAt) || a.id.localeCompare(b.id));
}

export function visitedCities(trips, cities) {
  const ids = new Set(publishedTrips(trips).flatMap((trip) => trip.data.visitedCityIds));
  return cities.filter((city) => ids.has(city.id));
}

export function tripsForCity(trips, cityId) {
  return publishedTrips(trips).filter((trip) => trip.data.cityIds.includes(cityId) || trip.data.visitedCityIds.includes(cityId));
}

export function publicAsset(value) {
  return typeof value === 'string' && !/[\\\u0000-\u0020]/.test(value) && (/^\/(?!\/)/.test(value) || /^https:\/\//.test(value));
}

export function displayCityIds(trip) {
  return trip.data.status==='completed' && trip.data.visitedCityIds.length
    ? trip.data.visitedCityIds : trip.data.cityIds;
}
