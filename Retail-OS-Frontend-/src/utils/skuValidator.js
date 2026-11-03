/**
 * E-commerce standard SKU validation and normalization utility.
 *
 * Rules:
 * 1. Mandatory field.
 * 2. Minimum length: 3 characters.
 * 3. Maximum length: 50 characters.
 * 4. Allowed characters: uppercase English letters (A-Z), numbers (0-9), and hyphens (-).
 * 5. Disallow spaces.
 * 6. Disallow special characters (@, #, $, %, &, /, _, etc.).
 * 7. Disallow SKU starting or ending with a hyphen.
 * 8. Disallow consecutive hyphens (--).
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
    if (!rawStr.trim()) {
        return 'SKU is required';
    }

    if (/\s/.test(rawStr)) {
        return 'SKU cannot contain spaces';
    }

    const value = rawStr.trim().toUpperCase();

    if (value.length < 3) {
        return 'SKU must be at least 3 characters long';
    }

    if (value.length > 50) {
        return 'SKU cannot exceed 50 characters';
    }

    if (value.startsWith('-')) {
        return 'SKU cannot start with a hyphen (-)';
    }

    if (value.endsWith('-')) {
        return 'SKU cannot end with a hyphen (-)';
    }

    if (/--/.test(value)) {
        return 'SKU cannot contain consecutive hyphens (--)';
    }

    if (!/^[A-Z0-9-]+$/.test(value)) {
        return 'SKU can only contain uppercase letters (A-Z), numbers (0-9), and hyphens (-)';
    }

    return '';
};

