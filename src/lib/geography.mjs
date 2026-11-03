export function normalizeCityCountry(city) {
  return ['CHN', 'TWN', 'HKG', 'MAC'].includes(city.countryCode)
    ? { ...city, countryCode: 'CHN', countryName: '中国' }
    : city;
}
