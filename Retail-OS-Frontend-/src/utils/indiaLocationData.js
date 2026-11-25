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

/**
 * Official and complete Indian District directory for all 28 States and 8 Union Territories.
 * Aligned with Local Government Directory (LGD) and Government of India administrative records.
 */
export const INDIAN_DISTRICTS = {
    'Andaman and Nicobar Islands': [
        'Nicobar', 'North and Middle Andaman', 'South Andaman'
    ],
    'Andhra Pradesh': [
        'Alluri Sitharama Raju', 'Anakapalli', 'Ananthapuramu', 'Annamayya', 'Bapatla',
        'Chittoor', 'Dr. B.R. Ambedkar Konaseema', 'East Godavari', 'Eluru', 'Guntur',
        'Kakinada', 'Krishna', 'Kurnool', 'Nandyal', 'NTR', 'Palnadu',
        'Parvathipuram Manyam', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Sri Sathya Sai',
        'Srikakulam', 'Tirupati', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'
    ],
    'Arunachal Pradesh': [
        'Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang',
        'Itanagar Capital Complex', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Leparada',
        'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri',
        'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang',
        'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'
    ],
    'Assam': [
        'Bajali', 'Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon',
        'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji',
        'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat',
        'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan',
        'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli',
        'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur',
        'South Salmara-Mankachar', 'Tamulpur', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'
    ],
    'Bihar': [
        'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
        'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
        'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
        'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
        'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
        'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
        'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
        'Supaul', 'Vaishali', 'West Champaran'
    ],
    'Chandigarh': [
        'Chandigarh'
    ],
    'Chhattisgarh': [
        'Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara',
        'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg',
        'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham',
        'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Koriya',
        'Mahasamund', 'Manendragarh-Chirmiri-Bharatpur', 'Mohla-Manpur-Ambagarh Chowki', 'Mungeli', 'Narayanpur',
        'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh',
        'Sukma', 'Surajpur', 'Surguja'
    ],
    'Dadra and Nagar Haveli and Daman and Diu': [
        'Dadra and Nagar Haveli', 'Daman', 'Diu'
    ],
    'Delhi': [
        'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
        'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi',
        'West Delhi'
    ],
    'Goa': [
        'North Goa', 'South Goa'
    ],
    'Gujarat': [
        'Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha',
        'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod',
        'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar',
        'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana',
        'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan',
        'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
        'Tapi', 'Vadodara', 'Valsad'
    ],
    'Haryana': [
        'Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad',
        'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal',
        'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal',
        'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa',
        'Sonipat', 'Yamunanagar'
    ],
    'Himachal Pradesh': [
        'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur',
        'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur',
        'Solan', 'Una'
    ],
    'Jammu and Kashmir': [
        'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda',
        'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam',
        'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban',
        'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'
    ],
    'Jharkhand': [
        'Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka',
        'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla',
        'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar',
        'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi',
        'Sahebganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'
    ],
    'Karnataka': [
        'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
        'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
        'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
        'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
        'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
        'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura',
        'Yadgir'
    ],
    'Kerala': [
        'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod',
        'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad',
        'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'
    ],
    'Ladakh': [
        'Kargil', 'Leh'
    ],
    'Lakshadweep': [
        'Lakshadweep'
    ],
    'Madhya Pradesh': [
        'Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat',
        'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur',
        'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas',
        'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda',
        'Hoshangabad (Narmadapuram)', 'Indore', 'Jabalpur', 'Jhabua', 'Katni',
        'Khandwa', 'Khargone', 'Maihar', 'Mandla', 'Mandsaur',
        'Mauganj', 'Morena', 'Narsinghpur', 'Neemuch', 'Niwari',
        'Pandhurna', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam',
        'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni',
        'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi',
        'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'
    ],
    'Maharashtra': [
        'Ahmednagar (Ahilyanagar)', 'Akola', 'Amravati', 'Beed', 'Bhandara',
        'Buldhana', 'Chandrapur', 'Chhatrapati Sambhajinagar (Aurangabad)', 'Dharashiv (Osmanabad)', 'Dhule',
        'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
        'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
        'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani',
        'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
        'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim',
        'Yavatmal'
    ],
    'Manipur': [
        'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West',
        'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney',
        'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal',
        'Ukhrul'
    ],
    'Meghalaya': [
        'East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'Eastern West Khasi Hills', 'North Garo Hills',
        'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills',
        'West Jaintia Hills', 'West Khasi Hills'
    ],
    'Mizoram': [
        'Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib',
        'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual',
        'Serchhip'
    ],
    'Nagaland': [
        'Chumoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng',
        'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren',
        'Phek', 'Shamator', 'Tseminyu', 'Tuensang', 'Wokha',
        'Zunheboto'
    ],
    'Odisha': [
        'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak',
        'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati',
        'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
        'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput',
        'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
        'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
    ],
    'Puducherry': [
        'Karaikal', 'Mahe', 'Puducherry', 'Yanam'
    ],
    'Punjab': [
        'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib',
        'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar',
        'Kapurthala', 'Ludhiana', 'Malerkotla', 'Mansa', 'Moga',
        'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar (Mohali)',
        'Sangrur', 'Shahid Bhagat Singh Nagar (Nawanshahr)', 'Tarn Taran'
    ],
    'Rajasthan': [
        'Ajmer', 'Alwar', 'Anupgarh', 'Balotra', 'Banswara',
        'Baran', 'Barmer', 'Beawar', 'Bharatpur', 'Bhilwara',
        'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa',
        'Deeg', 'Dholpur', 'Didwana-Kuchaman', 'Dudu', 'Dungarpur',
        'Ganganagar', 'Gangapur City', 'Hanumangarh', 'Hindaun', 'Jaipur',
        'Jaipur Rural', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu',
        'Jodhpur', 'Jodhpur Rural', 'Karauli', 'Kekri', 'Khairthal-Tijara',
        'Kota', 'Kotputli-Behror', 'Nagaur', 'Neem Ka Thana', 'Pali',
        'Phalodi', 'Pratapgarh', 'Rajsamand', 'Salumbar', 'Sanchore',
        'Sawai Madhopur', 'Shahpura', 'Sikar', 'Sirohi', 'Tonk',
        'Udaipur'
    ],
    'Sikkim': [
        'Gangtok', 'Gyalshing', 'Mangan', 'Namchi', 'Pakyong',
        'Soreng'
    ],
    'Tamil Nadu': [
        'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore',
        'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram',
        'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladuthurai',
        'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
        'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi',
        'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
        'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur',
        'Vellore', 'Viluppuram', 'Virudhunagar'
    ],
    'Telangana': [
        'Adilabad', 'Bhadradri Kothagudem', 'Hanamkonda', 'Hyderabad', 'Jagtial',
        'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar',
        'Khammam', 'Kumuram Bheem Asifabad', 'Mahabubabad', 'Mahabubnagar', 'Mancherial',
        'Medak', 'Medchal-Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda',
        'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla',
        'Ranga Reddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
        'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'
    ],
    'Tripura': [
        'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala',
        'South Tripura', 'Unakoti', 'West Tripura'
    ],
    'Uttar Pradesh': [
        'Agra', 'Aligarh', 'Ambedkar Nagar', 'Amethi', 'Amroha',
        'Auraiya', 'Ayodhya', 'Azamgarh', 'Baghpat', 'Bahraich',
        'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly',
        'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr',
        'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah',
        'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad',
        'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur',
        'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi',
        'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi',
        'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Maharajganj',
        'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut',
        'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh',
        'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal',
        'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shrawasti', 'Siddharthnagar',
        'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'
    ],
    'Uttarakhand': [
        'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun',
        'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag',
        'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'
    ],
    'West Bengal': [
        'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur',
        'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram',
        'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia',
        'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur',
        'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'
    ]
};

// In-memory cache for fast O(1) synchronous district lookups
const districtCache = new Map();

/**
 * Get complete, sorted list of districts for a given Indian State or Union Territory.
 * Covers all 28 states and 8 Union Territories based on official LGD administrative records.
 *
 * @param {string} stateName - The state or UT name (e.g. 'Maharashtra', 'Karnataka')
 * @returns {string[]} Array of verified district names sorted alphabetically
 */
export function getDistrictsForState(stateName) {
    if (!stateName || typeof stateName !== 'string') return [];
    const normalizedState = stateName.trim();
    const cacheKey = normalizedState.toLowerCase();

    if (districtCache.has(cacheKey)) {
        return districtCache.get(cacheKey);
    }

    // Match state name case-insensitively
    let matchedKey = null;
    for (const key of Object.keys(INDIAN_DISTRICTS)) {
        if (key.toLowerCase() === cacheKey) {
            matchedKey = key;
            break;
        }
    }

    const districts = matchedKey ? [...(INDIAN_DISTRICTS[matchedKey] || [])] : [];
    districts.sort((a, b) => a.localeCompare(b));
    districtCache.set(cacheKey, districts);
    return districts;
}

/**
 * Check if a district belongs to the verified list for the given state (case-insensitive).
 *
 * @param {string} stateName - State name
 * @param {string} districtName - District name to check
 * @returns {boolean} True if district is in the predefined list
 */
export function isKnownDistrict(stateName, districtName) {
    if (!stateName || !districtName) return false;
    const districts = getDistrictsForState(stateName);
    const normalizedDistrict = districtName.trim().toLowerCase();
    return districts.some(d => d.toLowerCase() === normalizedDistrict);
}

/**
 * Standard 2-digit Indian GST State Codes (CBIC / GST Council).
 * Used to validate GSTIN against the store's selected State / Union Territory.
 */
export const INDIAN_STATE_GST_CODES = {
    'Andaman and Nicobar Islands': ['35'],
    'Andhra Pradesh': ['28', '37'],
    'Arunachal Pradesh': ['12'],
    'Assam': ['18'],
    'Bihar': ['10'],
    'Chandigarh': ['04'],
    'Chhattisgarh': ['22'],
    'Dadra and Nagar Haveli and Daman and Diu': ['26'],
    'Delhi': ['07'],
    'Goa': ['30'],
    'Gujarat': ['24'],
    'Haryana': ['06'],
    'Himachal Pradesh': ['02'],
    'Jammu and Kashmir': ['01'],
    'Jharkhand': ['20'],
    'Karnataka': ['29'],
    'Kerala': ['32'],
    'Ladakh': ['38'],
    'Lakshadweep': ['31'],
    'Madhya Pradesh': ['23'],
    'Maharashtra': ['27'],
    'Manipur': ['14'],
    'Meghalaya': ['17'],
    'Mizoram': ['15'],
    'Nagaland': ['13'],
    'Odisha': ['21'],
    'Puducherry': ['34'],
    'Punjab': ['03'],
    'Rajasthan': ['08'],
    'Sikkim': ['11'],
    'Tamil Nadu': ['33'],
    'Telangana': ['36'],
    'Tripura': ['16'],
    'Uttar Pradesh': ['09'],
    'Uttarakhand': ['05'],
    'West Bengal': ['19']
};

/**
 * Get valid GST state code prefixes for a given state name.
 * @param {string} stateName
 * @returns {string[]} Array of valid 2-digit state codes (e.g. ['27'] for Maharashtra)
 */
export function getGstStateCodes(stateName) {
    if (!stateName) return [];
    const normalized = stateName.trim().toLowerCase();
    for (const [key, codes] of Object.entries(INDIAN_STATE_GST_CODES)) {
        if (key.toLowerCase() === normalized) {
            return codes;
        }
    }
    return [];
}


