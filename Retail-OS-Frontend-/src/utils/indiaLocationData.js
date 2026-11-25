import { State, City } from 'country-state-city';

/**
 * Complete list of all 28 Indian States and 8 Union Territories (36 total).
 * Canonical names match backend validators and Indian Government LGD directory.
 */
export const INDIAN_STATES = [
    'Andaman and Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu and Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Lakshadweep',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
];

/**
 * Curated prominent retail hubs, major commercial districts, and common aliases
 * to ensure maximum retail real-world compatibility alongside LGD/country-state-city data.
 */
const ADDITIONAL_RETAIL_HUBS = {
    'Karnataka': ['Bangalore', 'Mangalore', 'Mysore', 'Hubli', 'Belgaum', 'Gulbarga', 'Bellary', 'Shimoga', 'Tumkur'],
    'Maharashtra': ['Navi Mumbai', 'Chhatrapati Sambhajinagar', 'Dharashiv', 'Baramati', 'Pimpri-Chinchwad'],
    'Delhi': [
        'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
        'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi',
        'West Delhi', 'Connaught Place', 'Dwarka', 'Karol Bagh', 'Rohini', 'Saket',
        'Lajpat Nagar', 'Pitampura', 'Hauz Khas', 'Chandni Chowk', 'Janakpuri', 'Vasant Kunj'
    ],
    'Gujarat': ['Baroda', 'Gandhidham'],
    'Tamil Nadu': ['Trichy', 'Pondicherry', 'Ooty'],
    'Kerala': ['Trivandrum', 'Cochin', 'Calicut', 'Alleppey', 'Trichur', 'Palghat', 'Quilon'],
    'Uttar Pradesh': ['Banaras', 'Allahabad', 'Faizabad', 'Greater Noida'],
    'Haryana': ['Gurgaon', 'Panchkula'],
    'Punjab': ['Mohali', 'SAS Nagar'],
    'Puducherry': ['Pondicherry'],
    'Andaman and Nicobar Islands': ['Diglipur', 'Rangat', 'Mayabunder', 'Car Nicobar'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
    'Lakshadweep': ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Minicoy']
};

// Build state code map for India
const stateCodeMap = new Map();
try {
    const indianStates = State.getStatesOfCountry('IN') || [];
    indianStates.forEach(s => {
        if (s.name && s.isoCode) {
            stateCodeMap.set(s.name.toLowerCase().trim(), s.isoCode);
        }
    });
} catch (err) {
    console.error('Error initializing India state code map:', err);
}

// In-memory cache for fast O(1) synchronous lookups
const cityCache = new Map();

/**
 * Get complete, sorted list of cities and towns for a given Indian State or Union Territory.
 * Dynamically queries country-state-city database, adds verified retail aliases,
 * removes duplicates, and returns alphabetically sorted array.
 *
 * @param {string} stateName - The state or UT name (e.g. 'Maharashtra', 'Karnataka')
 * @returns {string[]} Array of verified city/town names sorted alphabetically
 */
export function getCitiesForState(stateName) {
    if (!stateName || typeof stateName !== 'string') return [];
    const normalizedState = stateName.trim();
    const cacheKey = normalizedState.toLowerCase();

    if (cityCache.has(cacheKey)) {
        return cityCache.get(cacheKey);
    }

    const iso = stateCodeMap.get(cacheKey);
    const resultList = [];
    const seen = new Set();

    if (iso) {
        try {
            const rawCities = City.getCitiesOfState('IN', iso) || [];
            rawCities.forEach(c => {
                const name = c.name ? c.name.trim() : '';
                if (name && !seen.has(name.toLowerCase())) {
                    seen.add(name.toLowerCase());
                    resultList.push(name);
                }
            });
        } catch (err) {
            console.error(`Error fetching cities for state ${stateName}:`, err);
        }
    }

    // Merge any additional retail commercial hubs or common aliases
    const extras = ADDITIONAL_RETAIL_HUBS[normalizedState] || [];
    extras.forEach(extra => {
        const name = extra.trim();
        if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            resultList.push(name);
        }
    });

    // Sort alphabetically
    resultList.sort((a, b) => a.localeCompare(b));
    cityCache.set(cacheKey, resultList);
    return resultList;
}

/**
 * Check if a city belongs to the verified list for the given state (case-insensitive).
 *
 * @param {string} stateName - State name
 * @param {string} cityName - City name to check
 * @returns {boolean} True if city is in the predefined list
 */
export function isKnownCity(stateName, cityName) {
    if (!stateName || !cityName) return false;
    const cities = getCitiesForState(stateName);
    const normalizedCity = cityName.trim().toLowerCase();
    return cities.some(c => c.toLowerCase() === normalizedCity);
}

/**
 * Find canonical casing for a city name in the state's verified list, or null.
 *
 * @param {string} stateName - State name
 * @param {string} cityName - City name to match
 * @returns {string|null} The canonical city name or null
 */
export function findCanonicalCityName(stateName, cityName) {
    if (!stateName || !cityName) return null;
    const cities = getCitiesForState(stateName);
    const normalizedCity = cityName.trim().toLowerCase();
    const found = cities.find(c => c.toLowerCase() === normalizedCity);
    return found || null;
}
