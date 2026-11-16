/**
 * Generate user initials from a full name string.
 * Examples:
 * - "Rahul Patil"  -> "RP"
 * - "Admin User"   -> "AU"
 * - "Super Admin"  -> "SA"
 * - "Admin"        -> "A"
 * - ""             -> "A"
 */
export const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'A';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'A';
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
};

/**
 * Format a human-readable display name from an identifier (email, username, or phone).
 * Examples:
 * - "rahul.patil@example.com" -> "Rahul Patil"
 * - "admin@retailos.com"      -> "Admin"
 * - "john.doe@company.com"    -> "John Doe"
 * - "super_admin@gmail.com"   -> "Super Admin"
 * - "admin"                   -> "Admin"
 */
export const formatNameFromIdentifier = (identifier, fallback = 'Admin') => {
    if (!identifier || typeof identifier !== 'string') return fallback;
    const trimmed = identifier.trim();
    if (!trimmed) return fallback;

    // If identifier is email
    if (trimmed.includes('@')) {
        const local = trimmed.split('@')[0];
        if (!local) return fallback;
        const cleaned = local.replace(/[._\-+]+/g, ' ').trim();
        if (!cleaned) return fallback;
        return cleaned
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    // If pure number (phone)
    if (/^\+?\d+$/.test(trimmed)) {
        return fallback;
    }

    // Alphanumeric identifier / username
    const cleaned = trimmed.replace(/[._\-+]+/g, ' ').trim();
    return (
        cleaned
            .split(/\s+/)
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ') || fallback
    );
};

/**
 * Resolve display user info (name, email, role, initials) from stored user, token payload, and credentials.
 */
export const resolveUserInfo = (user = {}, fallbackIdentifier = '') => {
    const id = user?.email || user?.identifier || fallbackIdentifier || '';

    // 1. Resolve Name
    let rawName =
        user?.full_name ||
        user?.name ||
        user?.username ||
        user?.user_name ||
        user?.admin_name;

    // Discard old hardcoded dummy values
    if (rawName === 'Akshay Chavan' || rawName === 'Super User') {
        rawName = null;
    }

    const credentialsName = id && id !== 'akshay.chavan@shekruweb.com'
        ? formatNameFromIdentifier(id, 'Admin')
        : 'Admin';

    let name;
    if (user?.is_custom_name && rawName) {
        // User explicitly updated and saved their name in Profile
        name = rawName;
    } else if (id && id.includes('@')) {
        // Name should reflect login credentials.
        // If rawName is missing, or if rawName contradicts the credentials email
        // (e.g. 'Amit Sharma' when the credentials are 'rahul.patil@example.com'),
        // strictly enforce the credentials name.
        if (!rawName) {
            name = credentialsName;
        } else {
            const emailUser = id.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            const rawClean = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const rawWords = rawName.toLowerCase().split(/\s+/).filter(Boolean);
            const matchesCredentials =
                rawWords.some((w) => w.length > 2 && emailUser.includes(w)) ||
                emailUser.includes(rawClean);

            if (matchesCredentials) {
                name = rawName;
            } else {
                // Name does not match credentials (e.g. 'Amit Sharma' for 'rahul.patil@example.com')
                name = credentialsName;
            }
        }
    } else {
        name = rawName || credentialsName;
    }

    // 2. Resolve Email
    let email = user?.email;
    if (email === 'akshay.chavan@shekruweb.com') {
        email = null;
    }
    if (!email) {
        if (user?.identifier && user.identifier.includes('@') && user.identifier !== 'akshay.chavan@shekruweb.com') {
            email = user.identifier;
        } else if (fallbackIdentifier && fallbackIdentifier.includes('@')) {
            email = fallbackIdentifier;
        } else {
            email = 'admin@retailos.com';
        }
    }

    // 3. Resolve Role
    let role =
        user?.role?.name ||
        (typeof user?.role === 'string' ? user.role : null);

    if (!role || role.toLowerCase() === 'employee' || role.toLowerCase() === 'user') {
        const idLower = (email || user?.identifier || fallbackIdentifier || '').toLowerCase();
        if (idLower.includes('admin')) {
            role = 'Admin';
        } else if (!role) {
            role = 'Admin';
        }
    }

    // 4. Initials
    const initials = getInitials(name);

    return { name, email, role, initials };
};
