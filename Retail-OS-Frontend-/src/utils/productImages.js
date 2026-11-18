/**
 * Retail Product Image Helper
 * Direct-imported local assets for 100% reliable, zero-404, offline-ready product imagery.
 * Works seamlessly in both Vite development and production bundles.
 */

import butterCookiesImg from '../assets/products/butter-cookies.jpg';
import fitnessTrackerImg from '../assets/products/fitness-tracker.jpg';
import greenTeaImg from '../assets/products/green-tea.jpg';
import jeansImg from '../assets/products/jeans.jpg';
import marieBiscuitsImg from '../assets/products/marie-biscuits.jpg';
import milkBottleImg from '../assets/products/milk-bottle.jpg';
import oreoImg from '../assets/products/oreo.jpg';
import parleGImg from '../assets/products/parle-g.jpg';
import steelBottleImg from '../assets/products/steel-bottle.jpg';
import tshirtImg from '../assets/products/tshirt.jpg';
import usbChargerImg from '../assets/products/usb-charger.jpg';
import walletImg from '../assets/products/wallet.jpg';

export const LOCAL_PRODUCT_IMAGES = {
    tshirt: tshirtImg,
    parleG: parleGImg,
    wallet: walletImg,
    greenTea: greenTeaImg,
    fitnessTracker: fitnessTrackerImg,
    jeans: jeansImg,
    usbCharger: usbChargerImg,
    milkBottle: milkBottleImg,
    marieBiscuits: marieBiscuitsImg,
    oreo: oreoImg,
    butterCookies: butterCookiesImg,
    steelBottle: steelBottleImg,
};

export const DEFAULT_PRODUCT_FALLBACK = parleGImg;

export const resolveProductImage = (product) => {
    if (!product) return DEFAULT_PRODUCT_FALLBACK;

    // Direct string passed
    if (typeof product === 'string') {
        const trimmed = product.trim();
        if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
            return trimmed;
        }
        // Direct local file match
        if (trimmed.includes('tshirt')) return tshirtImg;
        if (trimmed.includes('parle-g') || trimmed.includes('parleg')) return parleGImg;
        if (trimmed.includes('wallet')) return walletImg;
        if (trimmed.includes('green-tea')) return greenTeaImg;
        if (trimmed.includes('fitness-tracker')) return fitnessTrackerImg;
        if (trimmed.includes('jeans')) return jeansImg;
        if (trimmed.includes('usb-charger') || trimmed.includes('charger')) return usbChargerImg;
        if (trimmed.includes('milk-bottle') || trimmed.includes('milk')) return milkBottleImg;
        if (trimmed.includes('marie-biscuits') || trimmed.includes('marie')) return marieBiscuitsImg;
        if (trimmed.includes('oreo')) return oreoImg;
        if (trimmed.includes('butter-cookies')) return butterCookiesImg;
        if (trimmed.includes('steel-bottle')) return steelBottleImg;

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
            // Absolute HTTP or data URI
            if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            // Direct local file match
            if (trimmed.includes('tshirt')) return tshirtImg;
            if (trimmed.includes('parle-g') || trimmed.includes('parleg')) return parleGImg;
            if (trimmed.includes('wallet')) return walletImg;
            if (trimmed.includes('green-tea')) return greenTeaImg;
            if (trimmed.includes('fitness-tracker')) return fitnessTrackerImg;
            if (trimmed.includes('jeans')) return jeansImg;
            if (trimmed.includes('usb-charger') || trimmed.includes('charger')) return usbChargerImg;
            if (trimmed.includes('milk-bottle') || trimmed.includes('milk')) return milkBottleImg;
            if (trimmed.includes('marie-biscuits') || trimmed.includes('marie')) return marieBiscuitsImg;
            if (trimmed.includes('oreo')) return oreoImg;
            if (trimmed.includes('butter-cookies')) return butterCookiesImg;
            if (trimmed.includes('steel-bottle')) return steelBottleImg;

            // Backend uploaded files
            if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/') || trimmed.startsWith('media/') || trimmed.startsWith('static/')) {
                const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
                return `https://api-testing.myretailos.com${cleanPath}`;
            }
        }
    }

    const name = String(product.name || product.title || '').toLowerCase();
    const cat = String(product.category || product.category_name || '').toLowerCase();

    // ── Local Direct-Import Matches (Guaranteed to display, zero network failure) ──
    if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('shirt') || name.includes('polo') || name.includes('tees')) {
        return tshirtImg;
    }
    if (name.includes('jean') || name.includes('denim') || name.includes('pant') || name.includes('trouser')) {
        return jeansImg;
    }
    if (name.includes('wallet') || name.includes('purse') || name.includes('card holder')) {
        return walletImg;
    }
    if (name.includes('tea') || name.includes('chai') || name.includes('coffee')) {
        return greenTeaImg;
    }
    if (name.includes('fitness') || name.includes('tracker') || name.includes('smartwatch') || name.includes('band') || name.includes('watch')) {
        return fitnessTrackerImg;
    }
    if (name.includes('charger') || name.includes('usb') || name.includes('cable') || name.includes('adapter') || name.includes('power bank')) {
        return usbChargerImg;
    }
    if (name.includes('milk') || name.includes('dairy') || name.includes('paneer') || name.includes('curd') || name.includes('cheese')) {
        return milkBottleImg;
    }
    if (name.includes('marie') || name.includes('cracker')) {
        return marieBiscuitsImg;
    }
    if (name.includes('oreo')) {
        return oreoImg;
    }
    if (name.includes('butter cookie') || name.includes('tin') || name.includes('cookies') || name.includes('bakery')) {
        return butterCookiesImg;
    }
    if (name.includes('parle') || name.includes('biscuit') || name.includes('glucose') || name.includes('rusk')) {
        return parleGImg;
    }
    if (name.includes('bottle') || name.includes('flask') || name.includes('sipper') || name.includes('thermos') || name.includes('steel')) {
        return steelBottleImg;
    }

    // ── Category Fallbacks ──
    if (cat.includes('apparel') || cat.includes('cloth') || cat.includes('fashion') || cat.includes('garment')) {
        return tshirtImg;
    }
    if (cat.includes('grocer') || cat.includes('food') || cat.includes('snack') || cat.includes('fmcg')) {
        return parleGImg;
    }
    if (cat.includes('electronics') || cat.includes('gadget') || cat.includes('device') || cat.includes('tech')) {
        return usbChargerImg;
    }
    if (cat.includes('accessor') || cat.includes('lifestyle')) {
        return walletImg;
    }

    return DEFAULT_PRODUCT_FALLBACK;
};
