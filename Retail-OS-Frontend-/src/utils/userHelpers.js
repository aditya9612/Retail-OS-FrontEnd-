/**
 * Generate user initials from a full name string.
 * Examples:
 * - "Akshay Chavan" -> "AC"
 * - "Super User"    -> "SU"
 * - "Akshay"        -> "A"
 * - "Super"         -> "S"
 * - ""              -> "S"
 */
export const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'S';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'S';
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
};
