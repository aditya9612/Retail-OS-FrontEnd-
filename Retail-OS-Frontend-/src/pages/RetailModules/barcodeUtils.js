import jsPDF from 'jspdf';

/* ─────────────────────────────────────────────────────────────
   EAN-13 & Code 128 Encoding Tables & Bit Generators
───────────────────────────────────────────────────────────── */

const L_PATTERNS = [
    '0001101', '0011001', '0010011', '0111101', '0100011',
    '0110001', '0101111', '0111011', '0110111', '0001011'
];
const G_PATTERNS = [
    '0100111', '0110011', '0011011', '0100001', '0011101',
    '0111001', '0000101', '0010001', '0001001', '0010111'
];
const R_PATTERNS = [
    '1110010', '1100110', '1101100', '1000010', '1011100',
    '1001110', '1010000', '1000100', '1001000', '1110100'
];
const FIRST_DIGIT_PARITY = [
    'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
    'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
];

export function calculateEAN13CheckDigit(digits12) {
    let sum = 0;
    const clean = String(digits12).replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
    for (let i = 0; i < 12; i++) {
        const d = parseInt(clean[i], 10);
        sum += (i % 2 === 0) ? d : d * 3;
    }
    const rem = sum % 10;
    return rem === 0 ? 0 : 10 - rem;
}

export function getEAN13Bits(raw) {
    let digits = String(raw || '').replace(/\D/g, '');
    if (!digits) digits = '8901234567890';
    if (digits.length < 12) {
        digits = digits.padStart(12, '0');
    }
    if (digits.length === 12) {
        digits += String(calculateEAN13CheckDigit(digits));
    } else if (digits.length > 13) {
        digits = digits.slice(0, 13);
    }

    const first = parseInt(digits[0], 10) || 0;
    const parity = FIRST_DIGIT_PARITY[first] || 'LLLLLL';
    let bits = '101'; // Start guard

    for (let i = 1; i <= 6; i++) {
        const d = parseInt(digits[i], 10) || 0;
        const useG = parity[i - 1] === 'G';
        bits += useG ? G_PATTERNS[d] : L_PATTERNS[d];
    }

    bits += '01010'; // Center guard

    for (let i = 7; i <= 12; i++) {
        const d = parseInt(digits[i], 10) || 0;
        bits += R_PATTERNS[d];
    }

    bits += '101'; // End guard

    return { bits, digits };
}

const CODE128_WIDTHS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

function widthsToBits(widths) {
    let bits = '';
    let isBar = true;
    for (let i = 0; i < widths.length; i++) {
        const w = parseInt(widths[i], 10);
        bits += (isBar ? '1' : '0').repeat(w);
        isBar = !isBar;
    }
    return bits;
}

export function getCode128Bits(text) {
    const clean = String(text || '000000');
    let checksum = 104; // Start B
    const widths = [CODE128_WIDTHS[104]];

    for (let i = 0; i < clean.length; i++) {
        const code = clean.charCodeAt(i);
        const val = code >= 32 && code <= 126 ? code - 32 : 0;
        checksum += val * (i + 1);
        widths.push(CODE128_WIDTHS[val]);
    }

    const checkVal = checksum % 103;
    widths.push(CODE128_WIDTHS[checkVal]);
    widths.push(CODE128_WIDTHS[106]); // Stop

    let bits = '';
    for (const w of widths) {
        bits += widthsToBits(w);
    }
    return { bits, text: clean };
}

/* ─────────────────────────────────────────────────────────────
   Canvas Barcode & QR Code Image Renderers
───────────────────────────────────────────────────────────── */

export function renderBarcodeCanvas(bits, options = {}) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const height = options.height || 70;
    const scale = options.scale || 3;
    const quietZone = options.quietZone || 10;

    const width = (bits.length + quietZone * 2) * scale;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#000000';
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') {
            ctx.fillRect((quietZone + i) * scale, 0, scale, height);
        }
    }

    return canvas.toDataURL('image/png');
}

export function renderQRCodeCanvas(text, options = {}) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    const size = options.size || 200;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const N = 25;
    const cellSize = Math.floor(size / N);
    const offset = Math.floor((size - cellSize * N) / 2);

    const matrix = Array.from({ length: N }, () => Array(N).fill(false));

    function drawFinder(row, col) {
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
                    matrix[row + r][col + c] = true;
                }
            }
        }
    }

    drawFinder(0, 0);
    drawFinder(0, N - 7);
    drawFinder(N - 7, 0);

    for (let i = 7; i < N - 7; i++) {
        matrix[6][i] = (i % 2 === 0);
        matrix[i][6] = (i % 2 === 0);
    }

    const clean = String(text || 'RETAIL-OS');
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = ((hash << 5) - hash) + clean.charCodeAt(i);
        hash |= 0;
    }
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            const inTL = r < 8 && c < 8;
            const inTR = r < 8 && c >= N - 8;
            const inBL = r >= N - 8 && c < 8;
            const inTiming = r === 6 || c === 6;
            if (!inTL && !inTR && !inBL && !inTiming) {
                const bit = Math.abs((hash ^ (r * 31 + c * 17)) + (r * c)) % 3 === 0;
                matrix[r][c] = bit;
            }
        }
    }

    ctx.fillStyle = '#000000';
    for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
            if (matrix[r][c]) {
                ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
            }
        }
    }

    return canvas.toDataURL('image/png');
}

export function generateBarcodeDataUrl(barcode, standard = 'EAN-13') {
    const stdLower = String(standard || '').toLowerCase();
    if (stdLower.includes('qr')) {
        return renderQRCodeCanvas(barcode);
    }
    if (stdLower.includes('128')) {
        const { bits } = getCode128Bits(barcode);
        return renderBarcodeCanvas(bits);
    }
    const { bits } = getEAN13Bits(barcode);
    return renderBarcodeCanvas(bits);
}

/* ─────────────────────────────────────────────────────────────
   PDF Generation Function for Barcode Labels
───────────────────────────────────────────────────────────── */

export function generateBarcodeLabelsPDF({
    product,
    barcodeStandard = 'EAN-13 (Standard Retail)',
    labelSize = '50mm x 25mm (Thermal)',
    copies = 20,
    storeName = 'RetailOS Store',
    customBarcodeImage = null,
    action = 'download'
}) {
    if (!product || (!product.name && !product.barcode)) {
        throw new Error('No product selected or label data available');
    }

    const cleanCopies = Math.max(1, parseInt(copies, 10) || 1);
    const barcodeNumber = String(product.barcode || product.barcode_number || '8901234567890');
    const productName = String(product.name || 'Classic Polo T-Shirt');
    const subtitle = String(product.subtitle || (product.sku ? `SKU: ${product.sku}` : 'Size: L | Color: Navy Blue'));
    const rawPrice = product.mrp ?? product.sellingPrice ?? product.price ?? 1299;
    const formattedPrice = Number(rawPrice).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const priceText = `MRP: Rs. ${formattedPrice} (Incl. of GST)`;

    const barcodeImage = customBarcodeImage || generateBarcodeDataUrl(barcodeNumber, barcodeStandard);
    const isQR = String(barcodeStandard).toLowerCase().includes('qr');

    let doc;
    const sizeLower = String(labelSize || '').toLowerCase();

    if (sizeLower.includes('38mm')) {
        // 38mm x 25mm Standard Single Label Roll
        doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [38, 25] });
        for (let i = 0; i < cleanCopies; i++) {
            if (i > 0) doc.addPage([38, 25], 'landscape');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(99, 102, 241);
            doc.text(storeName.toUpperCase(), 19, 3.2, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(17, 24, 39);
            const truncatedName = productName.length > 20 ? productName.slice(0, 19) + '…' : productName;
            doc.text(truncatedName, 19, 6.2, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5);
            doc.setTextColor(100, 116, 139);
            const truncatedSub = subtitle.length > 26 ? subtitle.slice(0, 25) + '…' : subtitle;
            doc.text(truncatedSub, 19, 8.8, { align: 'center' });

            if (barcodeImage) {
                if (isQR) {
                    doc.addImage(barcodeImage, 'PNG', 13.5, 9.5, 11, 11);
                } else {
                    doc.addImage(barcodeImage, 'PNG', 3, 9.5, 32, 6.5);
                    doc.setFont('courier', 'bold');
                    doc.setFontSize(5.5);
                    doc.setTextColor(51, 65, 85);
                    doc.text(barcodeNumber, 19, 18, { align: 'center' });
                }
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(17, 24, 39);
            doc.text(priceText, 19, 22.5, { align: 'center' });
        }
    } else if (sizeLower.includes('a4')) {
        // A4 Sheet (24 labels/sheet — 3 columns x 8 rows)
        doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const labelsPerPage = 24;
        const leftMargin = 7;
        const topMargin = 12;
        const colWidth = 63.5;
        const rowHeight = 33.5;
        const colGap = 2.5;

        for (let idx = 0; idx < cleanCopies; idx++) {
            const pageIndex = Math.floor(idx / labelsPerPage);
            const indexOnPage = idx % labelsPerPage;

            if (idx > 0 && indexOnPage === 0) {
                doc.addPage('a4', 'portrait');
            }

            const col = indexOnPage % 3;
            const row = Math.floor(indexOnPage / 3);

            const x = leftMargin + col * (colWidth + colGap);
            const y = topMargin + row * rowHeight;
            const cx = x + colWidth / 2;

            // Optional sticker border
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.roundedRect(x, y, colWidth, rowHeight - 1, 2, 2, 'S');

            // Store Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(99, 102, 241);
            doc.text(storeName.toUpperCase(), cx, y + 4.2, { align: 'center' });

            // Product Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(17, 24, 39);
            const truncatedName = productName.length > 28 ? productName.slice(0, 27) + '…' : productName;
            doc.text(truncatedName, cx, y + 8.2, { align: 'center' });

            // Subtitle
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            const truncatedSub = subtitle.length > 34 ? subtitle.slice(0, 33) + '…' : subtitle;
            doc.text(truncatedSub, cx, y + 11.5, { align: 'center' });

            // Barcode Image
            if (barcodeImage) {
                if (isQR) {
                    doc.addImage(barcodeImage, 'PNG', cx - 6.5, y + 12.5, 13, 13);
                } else {
                    doc.addImage(barcodeImage, 'PNG', cx - 22, y + 12.5, 44, 9);
                    doc.setFont('courier', 'bold');
                    doc.setFontSize(6.5);
                    doc.setTextColor(51, 65, 85);
                    doc.text(barcodeNumber, cx, y + 24.5, { align: 'center' });
                }
            }

            // MRP
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(17, 24, 39);
            doc.text(priceText, cx, y + 29.5, { align: 'center' });
        }
    } else {
        // Default: 50mm x 25mm (Thermal) Single Label Roll
        doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [50, 25] });
        for (let i = 0; i < cleanCopies; i++) {
            if (i > 0) doc.addPage([50, 25], 'landscape');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(99, 102, 241);
            doc.text(storeName.toUpperCase(), 25, 3.5, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(17, 24, 39);
            const truncatedName = productName.length > 24 ? productName.slice(0, 23) + '…' : productName;
            doc.text(truncatedName, 25, 6.8, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.8);
            doc.setTextColor(100, 116, 139);
            const truncatedSub = subtitle.length > 32 ? subtitle.slice(0, 31) + '…' : subtitle;
            doc.text(truncatedSub, 25, 9.6, { align: 'center' });

            if (barcodeImage) {
                if (isQR) {
                    doc.addImage(barcodeImage, 'PNG', 18, 10.2, 14, 14);
                } else {
                    doc.addImage(barcodeImage, 'PNG', 5, 10.2, 40, 7.8);
                    doc.setFont('courier', 'bold');
                    doc.setFontSize(6.2);
                    doc.setTextColor(51, 65, 85);
                    doc.text(barcodeNumber, 25, 20.2, { align: 'center' });
                }
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(17, 24, 39);
            doc.text(priceText, 25, 23.6, { align: 'center' });
        }
    }

    const fileId = product?.sku ? String(product.sku).replace(/[^a-zA-Z0-9_-]/g, '_') : (product?.id || barcodeNumber);
    const safeFilename = `barcode-labels-${fileId}.pdf`;
    if (action === 'print') {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (e) {
                window.open(blobUrl, '_blank');
            }
        }, 500);
    } else {
        doc.save(safeFilename);
    }
    return { doc, filename: safeFilename, copies: cleanCopies };
}

/**
 * Download a barcode data URL as a PNG or SVG image file
 */
export function downloadBarcodeImage(dataUrl, filename = 'barcode.png') {
    if (!dataUrl) return false;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
}

/**
 * Download a Blob as a file
 */
export function downloadBlob(blob, filename = 'download') {
    if (!blob || typeof document === 'undefined') return false;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
}

/**
 * Generate a standalone scalable vector SVG string for the barcode
 */
export function generateBarcodeSVG(barcode, standard = 'EAN-13') {
    const stdLower = String(standard || '').toLowerCase();
    let bits = '';
    let displayText = String(barcode || '').trim();

    if (stdLower.includes('128')) {
        const res = getCode128Bits(displayText);
        bits = res.bits;
        displayText = res.text;
    } else {
        const res = getEAN13Bits(displayText);
        bits = res.bits;
        displayText = res.digits;
    }

    const quietZone = 10;
    const barWidth = 2;
    const height = 80;
    const totalWidth = (bits.length + quietZone * 2) * barWidth;

    let rects = '';
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') {
            const x = (quietZone + i) * barWidth;
            rects += `    <rect x="${x}" y="10" width="${barWidth}" height="${height - 30}" fill="#000000" />\n`;
        }
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}">
    <rect width="${totalWidth}" height="${height}" fill="#ffffff" />
${rects}
    <text x="${totalWidth / 2}" y="${height - 5}" text-anchor="middle" font-family="monospace, Courier, sans-serif" font-size="14" font-weight="bold" fill="#000000">${displayText}</text>
</svg>`;
}

/**
 * Generate a scalable vector SVG string for a complete printable thermal barcode label sticker
 */
export function generateLabelSVG({
    product,
    barcode,
    storeName = 'RetailOS Store',
    mrp = 0,
    barcodeStandard = 'EAN-13'
}) {
    const prodName = String(product?.name || 'Retail Product').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sku = String(product?.sku ? `SKU: ${product.sku}` : (product?.category || '')).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const store = String(storeName).toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const barcodeNum = String(barcode || product?.barcode || '0000000000000');
    const formattedPrice = Number(mrp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const stdLower = String(barcodeStandard || '').toLowerCase();
    let bits = '';
    if (stdLower.includes('128')) {
        bits = getCode128Bits(barcodeNum).bits;
    } else {
        bits = getEAN13Bits(barcodeNum).bits;
    }

    const width = 360;
    const height = 180;
    const barWidth = 2;
    const barcodeVisualWidth = bits.length * barWidth;
    const startX = Math.max(10, Math.floor((width - barcodeVisualWidth) / 2));

    let rects = '';
    for (let i = 0; i < bits.length; i++) {
        if (bits[i] === '1') {
            rects += `    <rect x="${startX + i * barWidth}" y="68" width="${barWidth}" height="52" fill="#000000" />\n`;
        }
    }

    return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" rx="8" ry="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="2" />
    <text x="${width / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#6366f1">${store}</text>
    <text x="${width / 2}" y="42" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="#111827">${prodName.length > 32 ? prodName.slice(0, 31) + '...' : prodName}</text>
    <text x="${width / 2}" y="58" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">${sku}</text>
${rects}
    <text x="${width / 2}" y="134" text-anchor="middle" font-family="monospace, Courier, sans-serif" font-size="11" font-weight="bold" fill="#334155">${barcodeNum}</text>
    <text x="${width / 2}" y="158" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#111827">MRP: ₹${formattedPrice} <tspan font-size="10" font-weight="normal" fill="#64748b">(Incl. of GST)</tspan></text>
</svg>`;
}

/**
 * Download SVG Barcode string as a .svg vector file
 */
export function downloadBarcodeSVG(svgString, filename = 'barcode.svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    return downloadBlob(blob, filename);
}

/**
 * Download SVG Label string as a .svg vector file
 */
export function downloadLabelSVG(svgString, filename = 'barcode-label.svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    return downloadBlob(blob, filename);
}
