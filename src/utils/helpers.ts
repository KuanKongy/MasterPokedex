
// Capitalize the first letter of a string
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Format Pokemon height (convert from decimeters to meters)
export function formatHeight(height: number): string {
  return `${(height / 10).toFixed(1)} m`;
}

// Format Pokemon weight (convert from hectograms to kilograms)
export function formatWeight(weight: number): string {
  return `${(weight / 10).toFixed(1)} kg`;
}

// Get a color based on stat value (for stat bars)
export function getStatColor(statValue: number): string {
  if (statValue < 30) return 'bg-red-500';
  if (statValue < 60) return 'bg-orange-400';
  if (statValue < 90) return 'bg-yellow-400';
  if (statValue < 120) return 'bg-green-400';
  if (statValue < 150) return 'bg-blue-400';
  return 'bg-purple-500';
}

// Get an English description from flavor text entries
export function getEnglishDescription(flavorTextEntries: { flavor_text: string, language: { name: string } }[]): string {
  const englishEntry = flavorTextEntries.find(entry => entry.language.name === 'en');
  if (!englishEntry) return 'No description available.';
  return englishEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
}

// Get Pokemon genus (category) in English
export function getEnglishGenus(genera: { genus: string, language: { name: string } }[]): string {
  const englishGenus = genera.find(g => g.language.name === 'en');
  return englishGenus ? englishGenus.genus : '';
}

// Format stat name for display
export function formatStatName(statName: string): string {
  const statNameMap: Record<string, string> = {
    'hp': 'HP',
    'attack': 'Attack',
    'defense': 'Defense',
    'special-attack': 'Sp. Atk',
    'special-defense': 'Sp. Def',
    'speed': 'Speed'
  };
  
  return statNameMap[statName] || capitalize(statName);
}
