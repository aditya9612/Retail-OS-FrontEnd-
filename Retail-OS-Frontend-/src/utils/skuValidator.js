/**
 * E-commerce standard SKU validation and normalization utility.
 *
 * Rules:
 * 1. Mandatory field.
 * 2. Minimum length: 2 characters.
 * 3. Maximum length: 50 characters.
 * 4. Allowed characters: uppercase English letters (A-Z), numbers (0-9), hyphens (-), and spaces.
 * 5. Disallow special characters (@, #, $, %, &, /, _, etc.).
 * 6. Disallow SKU starting or ending with a hyphen or space.
 * 7. Disallow consecutive hyphens or spaces.
 */

export const normalizeSku = (sku) => {
    if (sku === null || sku === undefined) return '';
    return String(sku).trim().toUpperCase();
};

export const validateSKUFormat = (sku) => {
    if (sku === null || sku === undefined) {
        return 'SKU is required';
    }

    const rawStr = String(sku);
    const value = rawStr.trim().toUpperCase();
    if (!value) {
        return 'SKU is required';
    }

    if (value.length < 2) {
        return 'SKU must be at least 2 characters long';
    }

    if (value.length > 50) {
        return 'SKU cannot exceed 50 characters';
    }

    if (value.startsWith('-') || value.startsWith(' ')) {
        return 'SKU cannot start with a hyphen (-) or space';
    }

    if (value.endsWith('-') || value.endsWith(' ')) {
        return 'SKU cannot end with a hyphen (-) or space';
    }

    if (/[ -]{2,}/.test(value)) {
        return 'SKU cannot contain consecutive hyphens or spaces';
    }

    if (!/^[A-Z0-9 -]+$/.test(value)) {
        return 'SKU can only contain uppercase letters (A-Z), numbers (0-9), spaces, and hyphens (-)';
    }

    return '';
};
