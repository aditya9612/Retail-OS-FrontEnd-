/**
 * Retail Product Image Helper
 * Resolves high-resolution, crystal-clear retail photography for products across POS Billing,
 * Product Catalog, and Product Management modules.
 */

export const DEFAULT_PRODUCT_FALLBACK = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=85';

export const resolveProductImage = (product) => {
    if (!product) return DEFAULT_PRODUCT_FALLBACK;

    // Direct string passed
    if (typeof product === 'string') {
        const trimmed = product.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        if (trimmed.startsWith('/') || trimmed.startsWith('uploads/')) {
            const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            return `https://api-testing.myretailos.com${cleanPath}`;
        }
        product = { name: trimmed };
    }

    // Check direct properties from various backend schemas
    const raw = (
        product.imageUrl ||
        product.image_url ||
        product.image ||
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
            trimmed.length > 5
        ) {
            if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) {
                return trimmed;
            }
            if (trimmed.startsWith('/') || trimmed.startsWith('uploads/') || trimmed.startsWith('media/') || trimmed.startsWith('static/') || trimmed.startsWith('images/')) {
                const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
                return `https://api-testing.myretailos.com${cleanPath}`;
            }
        }
    }

    const name = String(product.name || product.title || '').toLowerCase();
    const cat = String(product.category || product.category_name || '').toLowerCase();

    // ── Apparel & Fashion ──────────────────────────────────────────────────────────
    if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('polo') || name.includes('tees')) {
        return 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('shirt')) {
        return 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('jean') || name.includes('denim') || name.includes('pant') || name.includes('trouser')) {
        return 'https://images.unsplash.com/photo-1542272604-780c96856592?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('saree') || name.includes('kurti') || name.includes('kurta') || name.includes('dress') || name.includes('ethnic')) {
        return 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('jacket') || name.includes('hoodie') || name.includes('sweater') || name.includes('coat')) {
        return 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&auto=format&fit=crop&q=85';
    }

    // ── Footwear ──────────────────────────────────────────────────────────────────
    if (name.includes('shoe') || name.includes('sneaker') || name.includes('footwear') || name.includes('boot')) {
        return 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('sandal') || name.includes('slipper') || name.includes('flip')) {
        return 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?w=600&auto=format&fit=crop&q=85';
    }

    // ── Accessories & Lifestyle ───────────────────────────────────────────────────
    if (name.includes('wallet') || name.includes('purse')) {
        return 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('bag') || name.includes('backpack') || name.includes('handbag')) {
        return 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('sunglass') || name.includes('glass') || name.includes('spectacle') || name.includes('eyewear')) {
        return 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('bottle') || name.includes('flask') || name.includes('sipper') || name.includes('thermos')) {
        return 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=85';
    }

    // ── Groceries & Staples ───────────────────────────────────────────────────────
    if (name.includes('tea') || name.includes('chai')) {
        return 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('coffee') || name.includes('nescafe') || name.includes('bru')) {
        return 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('milk') || name.includes('dairy') || name.includes('paneer') || name.includes('curd') || name.includes('cheese')) {
        return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('marie')) {
        return 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('oreo')) {
        return 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('cookie') || name.includes('biscuit') || name.includes('parle') || name.includes('rusk')) {
        return 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('chocolate') || name.includes('cadbury') || name.includes('kitkat') || name.includes('candy')) {
        return 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('chip') || name.includes('snack') || name.includes('namkeen') || name.includes('wafer') || name.includes('kurkure')) {
        return 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('rice') || name.includes('basmati') || name.includes('dal') || name.includes('pulse') || name.includes('grain')) {
        return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('oil') || name.includes('ghee') || name.includes('mustard')) {
        return 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('atta') || name.includes('flour') || name.includes('wheat') || name.includes('maida') || name.includes('suji')) {
        return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('spice') || name.includes('masala') || name.includes('turmeric') || name.includes('chilli') || name.includes('salt') || name.includes('sugar')) {
        return 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('almond') || name.includes('cashew') || name.includes('nut') || name.includes('dry fruit') || name.includes('kaju') || name.includes('badam')) {
        return 'https://images.unsplash.com/photo-1508061252445-5350f3ab0a55?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('juice') || name.includes('drink') || name.includes('beverage') || name.includes('cola') || name.includes('soda') || name.includes('water')) {
        return 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('fruit') || name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('mango')) {
        return 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('vegetable') || name.includes('tomato') || name.includes('onion') || name.includes('potato')) {
        return 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?w=600&auto=format&fit=crop&q=85';
    }

    // ── Personal Care & Cleaning ──────────────────────────────────────────────────
    if (name.includes('soap') || name.includes('body wash') || name.includes('handwash') || name.includes('dettol')) {
        return 'https://images.unsplash.com/photo-1607006314170-4d8cb87042a4?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('shampoo') || name.includes('conditioner') || name.includes('hair oil')) {
        return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('toothpaste') || name.includes('toothbrush') || name.includes('dental') || name.includes('colgate')) {
        return 'https://images.unsplash.com/photo-1559591937-e1032367d341?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('perfume') || name.includes('deodorant') || name.includes('fragrance') || name.includes('spray')) {
        return 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('detergent') || name.includes('surf') || name.includes('cleaner') || name.includes('dishwash') || name.includes('vim')) {
        return 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=85';
    }

    // ── Electronics ───────────────────────────────────────────────────────────────
    if (name.includes('fitness') || name.includes('tracker') || name.includes('smartwatch') || name.includes('band')) {
        return 'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('charger') || name.includes('usb') || name.includes('cable') || name.includes('adapter') || name.includes('power bank')) {
        return 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('headphone') || name.includes('earphone') || name.includes('airpod') || name.includes('buds') || name.includes('headset')) {
        return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('mobile') || name.includes('phone') || name.includes('smartphone')) {
        return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('laptop') || name.includes('computer') || name.includes('tablet') || name.includes('ipad')) {
        return 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=85';
    }
    if (name.includes('pen') || name.includes('book') || name.includes('notebook') || name.includes('stationery')) {
        return 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=85';
    }

    // ── Category Fallbacks ────────────────────────────────────────────────────────
    if (cat.includes('apparel') || cat.includes('cloth') || cat.includes('fashion') || cat.includes('garment')) {
        return 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=85';
    }
    if (cat.includes('grocer') || cat.includes('food') || cat.includes('snack') || cat.includes('fmcg') || cat.includes('kitchen')) {
        return 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=85';
    }
    if (cat.includes('electronics') || cat.includes('gadget') || cat.includes('device') || cat.includes('tech')) {
        return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=600&auto=format&fit=crop&q=85';
    }
    if (cat.includes('accessor') || cat.includes('lifestyle')) {
        return 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=85';
    }
    if (cat.includes('beauty') || cat.includes('care') || cat.includes('health') || cat.includes('personal')) {
        return 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=85';
    }

    return DEFAULT_PRODUCT_FALLBACK;
};

