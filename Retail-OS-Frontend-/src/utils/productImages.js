/**
 * Retail Product Image Helper
 * Resolves local bundled assets and remote images with 100% reliable fallbacks.
 * Uses local bundled product photography in /images/products/ for instant, offline-capable display.
 */

export const DEFAULT_PRODUCT_FALLBACK = '/images/products/parle-g.jpg';

export const resolveProductImage = (product) => {
    if (!product) return DEFAULT_PRODUCT_FALLBACK;

    // Direct string passed
    if (typeof product === 'string') {
        const trimmed = product.trim();
        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
            return trimmed;
        }
        if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
            return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
        }
        if (trimmed.startsWith('/') || trimmed.startsWith('uploads/')) {
            const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            return `https://api-testing.myretailos.com${cleanPath}`;
        }
        product = { name: trimmed };
    }

    // Check direct properties from various backend schemas
    const raw = (
        product.image ||
        product.imageUrl ||
        product.image_url ||
        product.product_image ||
        product.product_image_url ||
        product.thumbnail ||
        (Array.isArray(product.images) && product.images[0]
            ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url || product.images[0]?.image_url)
            : null)
    );

    if (raw && typeof raw === 'string') {
        const trimmed = raw.trim().replace(/^["']+|["']+$/g, '');
        const lower = trimmed.toLowerCase();
        if (
            lower !== 'null' &&
            lower !== 'undefined' &&
            lower !== '[object object]' &&
            lower !== 'none' &&
            lower !== 'n/a' &&
            lower !== 'false' &&
            trimmed.length > 3
        ) {
            // Local frontend assets in public folder
            if (trimmed.startsWith('/images/') || trimmed.startsWith('images/')) {
                return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            }
            // Absolute HTTP or data URI
            if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            // Backend uploaded files
            if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/') || trimmed.startsWith('media/') || trimmed.startsWith('static/')) {
                const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
                return `https://api-testing.myretailos.com${cleanPath}`;
            }
        }
    }

    const name = String(product.name || product.title || '').toLowerCase();
    const cat = String(product.category || product.category_name || '').toLowerCase();

    // ── Local Bundled Photography Matches (Always available, Zero Network Failures) ──
    if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('shirt') || name.includes('polo') || name.includes('tees')) {
        return '/images/products/tshirt.jpg';
    }
    if (name.includes('jean') || name.includes('denim') || name.includes('pant') || name.includes('trouser')) {
        return '/images/products/jeans.jpg';
    }
    if (name.includes('wallet') || name.includes('purse') || name.includes('card holder')) {
        return '/images/products/wallet.jpg';
    }
    if (name.includes('tea') || name.includes('chai') || name.includes('coffee')) {
        return '/images/products/green-tea.jpg';
    }
    if (name.includes('fitness') || name.includes('tracker') || name.includes('smartwatch') || name.includes('band') || name.includes('watch')) {
        return '/images/products/fitness-tracker.jpg';
    }
    if (name.includes('charger') || name.includes('usb') || name.includes('cable') || name.includes('adapter') || name.includes('power bank')) {
        return '/images/products/usb-charger.jpg';
    }
    if (name.includes('milk') || name.includes('dairy') || name.includes('paneer') || name.includes('curd') || name.includes('cheese')) {
        return '/images/products/milk-bottle.jpg';
    }
    if (name.includes('marie') || name.includes('cracker')) {
        return '/images/products/marie-biscuits.jpg';
    }
    if (name.includes('oreo')) {
        return '/images/products/oreo.jpg';
    }
    if (name.includes('butter cookie') || name.includes('tin') || name.includes('cookies') || name.includes('bakery')) {
        return '/images/products/butter-cookies.jpg';
    }
    if (name.includes('parle') || name.includes('biscuit') || name.includes('glucose') || name.includes('rusk')) {
        return '/images/products/parle-g.jpg';
    }
    if (name.includes('bottle') || name.includes('flask') || name.includes('sipper') || name.includes('thermos') || name.includes('steel')) {
        return '/images/products/steel-bottle.jpg';
    }

    // ── Category Fallbacks ──
    if (cat.includes('apparel') || cat.includes('cloth') || cat.includes('fashion') || cat.includes('garment')) {
        return '/images/products/tshirt.jpg';
    }
    if (cat.includes('grocer') || cat.includes('food') || cat.includes('snack') || cat.includes('fmcg')) {
        return '/images/products/parle-g.jpg';
    }
    if (cat.includes('electronics') || cat.includes('gadget') || cat.includes('device') || cat.includes('tech')) {
        return '/images/products/usb-charger.jpg';
    }
    if (cat.includes('accessor') || cat.includes('lifestyle')) {
        return '/images/products/wallet.jpg';
    }

    return DEFAULT_PRODUCT_FALLBACK;
};
