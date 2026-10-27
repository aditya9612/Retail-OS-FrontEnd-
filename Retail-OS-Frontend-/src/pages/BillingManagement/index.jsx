import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
    BsFileEarmarkText, BsDownload, BsSearch, BsFilter,
    BsCheckCircleFill, BsHourglassSplit, BsXCircleFill,
    BsPrinter, BsCurrencyRupee, BsReceiptCutoff, BsCartCheck,
    BsBoxArrowUpRight, BsX, BsExclamationTriangleFill, BsListUl,
    BsPlusCircle, BsEyeFill, BsLightningChargeFill, BsArrowRepeat,
    BsFileEarmarkPdf, BsCreditCard, BsTrash, BsSliders, BsInfoCircle,
    BsCalendar3, BsShop, BsPerson, BsCashStack, BsCheck2Circle
} from 'react-icons/bs';

import {
    getCart,
    createInvoice,
    searchInvoices,
    getInvoiceById,
    getInvoiceByOrderId,
    getInvoicePdf,
    downloadInvoicePdf,
    previewInvoicePdf,
    getInvoiceThermal,
    getInvoiceThermalReceipt,
    reprintInvoice,
    generateInvoiceAsync,
    voidInvoice,
    getInvoiceByNumber,
    getInvoicePdfStatus,
    getStores,
    getCustomers,
    getProducts,
} from '../../services/invoiceService';

/* ── Status badges configuration ── */
const statusConfig = {
    paid: { color: '#10b981', bg: '#ecfdf5', label: 'Paid', icon: <BsCheckCircleFill size={11} /> },
    unpaid: { color: '#ef4444', bg: '#fef2f2', label: 'Unpaid', icon: <BsXCircleFill size={11} /> },
    partial: { color: '#8b5cf6', bg: '#f5f3ff', label: 'Partial', icon: <BsHourglassSplit size={11} /> },
    pending: { color: '#f59e0b', bg: '#fffbeb', label: 'Pending', icon: <BsHourglassSplit size={11} /> },
    cancelled: { color: '#ef4444', bg: '#fef2f2', label: 'Cancelled', icon: <BsXCircleFill size={11} /> },
    completed: { color: '#10b981', bg: '#ecfdf5', label: 'Completed', icon: <BsCheckCircleFill size={11} /> },
    returned: { color: '#ef4444', bg: '#fef2f2', label: 'Returned', icon: <BsXCircleFill size={11} /> },
    failed: { color: '#6b7280', bg: '#f3f4f6', label: 'Failed', icon: <BsXCircleFill size={11} /> },
    issued: { color: '#3b82f6', bg: '#eff6ff', label: 'Issued', icon: <BsCheckCircleFill size={11} /> },
};

const getStatusBadge = (st) => {
    const key = (st || 'issued').toLowerCase();
    const config = statusConfig[key] || {
        color: '#6366f1',
        bg: '#eef2ff',
        label: st || 'Issued',
        icon: <BsCheckCircleFill size={11} />,
    };
    return (
        <span
            className="dash-badge"
            style={{
                background: config.bg,
                color: config.color,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 6,
            }}
        >
            {config.icon}
            {config.label}
        </span>
    );
};

const fmt = (n) => {
    try {
        const val = Number(n);
        const safe = isNaN(val) ? 0 : val;
        return '₹' + safe.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    } catch (_) {
        return '₹0.00';
    }
};

const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return String(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (_) {
        return String(dateStr);
    }
};

/* ── Fallback/Offline Invoices from Local Storage ── */
const loadLocalInvoices = () => {
    try {
        const stored = localStorage.getItem('gst_invoices');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                return parsed.map((inv) => ({
                    id: inv.id || inv.invoice_number || `INV-${inv.order_id || Date.now()}`,
                    order_id: inv.order_id || inv.id || 0,
                    invoice_number: inv.invoice_number || inv.id || `INV-${Date.now()}`,
                    customer_name: inv.customer || inv.customer_name || 'Walk-in Customer',
                    customer_phone: inv.mobile || inv.phone || '—',
                    created_at: inv.date || inv.created_at || new Date().toISOString(),
                    subtotal: Number(inv.taxable || inv.taxable_amount || inv.subtotal || 0),
                    cgst_amount: Number(inv.cgst || inv.cgst_amount || 0),
                    sgst_amount: Number(inv.sgst || inv.sgst_amount || 0),
                    igst_amount: Number(inv.igst || inv.igst_amount || 0),
                    discount_amount: Number(inv.discount || inv.discount_amount || 0),
                    total_amount: Number(inv.amount || inv.total || inv.grand_total || inv.total_amount || 0),
                    status: inv.status || 'issued',
                    payment_mode: inv.mode || inv.payment_mode || 'Cash',
                    store_id: inv.store_id || 1,
                }));
            }
        }
    } catch (_) {}
    return [];
};

const BillingManagement = () => {
    // ── Search & Filter State ──────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchFilters, setSearchFilters] = useState({
        invoice_number: '',
        customer_name: '',
        mobile: '',
        gstin: '',
        payment_status: 'All',
        store_id: '1',
        date_from: '',
        date_to: '',
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [page, setPage] = useState(1);
    const perPage = 10;

    // ── Notifications / Toast banner ──────────────────────────────────────
    const [alertMsg, setAlertMsg] = useState(null);
    const showAlert = (text, type = 'success') => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 5000);
    };

    // ── Invoices Data ──────────────────────────────────────────────────────
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // ── Metadata for Dropdowns ─────────────────────────────────────────────
    const [availableStores, setAvailableStores] = useState([]);
    const [availableCustomers, setAvailableCustomers] = useState([]);
    const [availableProducts, setAvailableProducts] = useState([]);

    // ── Create Invoice Modal State (Strictly matching POST /api/v1/invoices) ──
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');
    const [newInvoiceData, setNewInvoiceData] = useState({
        store_id: 1,
        customer_id: null,
        same_state: true,
        items: [
            { product_id: 1, quantity: 1, unit_price: 500, discount: 0 },
        ],
        payments: [
            { payment_mode: 'cash', amount: 590, transaction_reference: '', amount_tendered: 600, change_due: 10 },
        ],
    });

    useEffect(() => {
        let isMounted = true;
        const loadMetadata = async () => {
            try {
                const [stores, customers, products] = await Promise.allSettled([
                    getStores(),
                    getCustomers(),
                    getProducts(),
                ]);
                if (isMounted) {
                    if (stores.status === 'fulfilled' && Array.isArray(stores.value) && stores.value.length > 0) {
                        setAvailableStores(stores.value);
                    }
                    if (customers.status === 'fulfilled' && Array.isArray(customers.value)) {
                        setAvailableCustomers(customers.value);
                    }
                    if (products.status === 'fulfilled' && Array.isArray(products.value) && products.value.length > 0) {
                        setAvailableProducts(products.value);
                    }
                }
            } catch (_) {}
        };
        loadMetadata();
        return () => { isMounted = false; };
    }, []);

    // Sync loaded stores into store_id if needed
    useEffect(() => {
        if (availableStores.length > 0) {
            const firstStoreId = availableStores[0].id;
            setNewInvoiceData(prev => ({
                ...prev,
                store_id: prev.store_id || firstStoreId
            }));
        }
    }, [availableStores]);

    // Sync loaded products into line items default
    useEffect(() => {
        if (availableProducts.length > 0) {
            const firstProd = availableProducts[0];
            const price = Number(firstProd.price || firstProd.selling_price || 500);
            const totalWithGst = Math.round(price * 1.18 * 100) / 100;
            setNewInvoiceData(prev => {
                const currentPid = prev.items[0]?.product_id;
                const matchedProd = availableProducts.find(p => p.id === currentPid);
                // If current product_id is not in availableProducts or is placeholder 1 when real product is different:
                if (!matchedProd || (currentPid === 1 && firstProd.id !== 1)) {
                    return {
                        ...prev,
                        items: [
                            {
                                product_id: firstProd.id,
                                quantity: 1,
                                unit_price: price,
                                discount: 0,
                            }
                        ],
                        payments: [
                            {
                                payment_mode: 'cash',
                                amount: totalWithGst,
                                transaction_reference: '',
                                amount_tendered: Math.ceil(totalWithGst),
                                change_due: Math.max(0, Math.round((Math.ceil(totalWithGst) - totalWithGst) * 100) / 100),
                            }
                        ]
                    };
                }
                return prev;
            });
        }
    }, [availableProducts]);

    // ── Debounce search input to prevent unnecessary API requests ──────────
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 450);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // ── Fetch Invoices List from Backend API ───────────────────────────────
    const fetchInvoicesList = useCallback(async () => {
        setLoadingInvoices(true);
        setFetchError(null);
        try {
            // Build backend query parameters strictly conforming to OpenAPI GET /api/v1/invoices
            const queryParams = { ...searchFilters };
            if (!queryParams.store_id) {
                queryParams.store_id = 1;
            }

            // Handle combined search input
            if (debouncedSearch) {
                if (/^inv/i.test(debouncedSearch) || debouncedSearch.startsWith('#')) {
                    queryParams.invoice_number = debouncedSearch.replace('#', '');
                } else if (debouncedSearch.length >= 2) {
                    queryParams.customer_name = debouncedSearch;
                } else if (debouncedSearch.length === 1) {
                    queryParams.invoice_number = debouncedSearch;
                }
            }

            const apiRes = await searchInvoices(queryParams);
            const list = Array.isArray(apiRes) ? apiRes : (apiRes?.data || apiRes?.items || []);
            const local = loadLocalInvoices();

            // Merge server list with any local mock items not yet on server
            const merged = [...list];
            local.forEach((loc) => {
                const exists = merged.some(
                    (m) => String(m.id).toLowerCase() === String(loc.id).toLowerCase() ||
                           String(m.invoice_number).toLowerCase() === String(loc.invoice_number).toLowerCase()
                );
                if (!exists) {
                    merged.push(loc);
                }
            });

            setInvoices(merged);
        } catch (err) {
            console.warn('[Invoices] API notice:', err.message);
            setFetchError(err.message || 'Could not load invoices from server.');
            setInvoices(loadLocalInvoices());
        } finally {
            setLoadingInvoices(false);
        }
    }, [searchFilters, debouncedSearch]);

    useEffect(() => {
        fetchInvoicesList();
    }, [fetchInvoicesList]);

    // ── Active POS Cart State ──────────────────────────────────────────────
    const [liveCart, setLiveCart] = useState(null);
    const [cartLoading, setCartLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const loadCart = async () => {
            setCartLoading(true);
            try {
                const data = await getCart();
                if (isMounted) setLiveCart(data);
            } catch (err) {
                console.warn('[Invoices] getCart notice:', err.message);
            } finally {
                if (isMounted) setCartLoading(false);
            }
        };
        loadCart();
        return () => { isMounted = false; };
    }, []);

    // ── Direct Invoice or Order ID Lookup ──────────────────────────────────
    const [lookupId, setLookupId] = useState('');
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');

    const handleLookup = async () => {
        const query = lookupId.trim();
        if (!query) {
            setLookupError('Please enter an Invoice ID or Order ID.');
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        try {
            let found = null;
            if (/^\d+$/.test(query)) {
                try {
                    found = await getInvoiceById(query);
                } catch (_) {}
            }
            if (!found) {
                try {
                    found = await getInvoiceByOrderId(query);
                } catch (_) {}
            }
            if (!found) {
                try {
                    found = await getInvoiceByNumber(query);
                } catch (_) {}
            }
            if (!found) {
                found = invoices.find(
                    (inv) => String(inv.id) === query ||
                             String(inv.order_id) === query ||
                             String(inv.invoice_number).toLowerCase() === query.toLowerCase()
                );
            }

            if (found) {
                setSelectedInvoice(found);
                setShowDetailModal(true);
            } else {
                setLookupError(`No invoice found matching "${query}".`);
            }
        } catch (err) {
            setLookupError(err.message || 'Error looking up invoice.');
        } finally {
            setLookupLoading(false);
        }
    };

    // ── Table Invoice Selection State (for Top Download Invoice action) ───
    const [selectedTableInvoiceId, setSelectedTableInvoiceId] = useState(null);
    const selectedTableInvoice = useMemo(() => {
        if (!selectedTableInvoiceId) return null;
        return invoices.find((inv) => String(inv.id) === String(selectedTableInvoiceId));
    }, [invoices, selectedTableInvoiceId]);

    // ── Dedicated PDF Preview & Print Modal State (Requirement 2) ───────────
    const [showPdfPreviewModal, setShowPdfPreviewModal] = useState(false);
    const [pdfPreviewInvoice, setPdfPreviewInvoice] = useState(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
    const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
    const [pdfDocType, setPdfDocType] = useState('invoice'); // 'invoice' | 'bill'
    const [pdfStatusPolling, setPdfStatusPolling] = useState(false);
    const [pdfStatusMessage, setPdfStatusMessage] = useState('');
    const previewIframeRef = useRef(null);

    // ── Download Invoice Modal State (Requirement 3) ────────────────────────
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadSearchNumber, setDownloadSearchNumber] = useState('');
    const [downloadLookupLoading, setDownloadLookupLoading] = useState(false);
    const [downloadLookupResult, setDownloadLookupResult] = useState(null);
    const [downloadLookupError, setDownloadLookupError] = useState('');
    const [downloadDocType, setDownloadDocType] = useState('invoice'); // 'invoice' | 'bill'

    // ── Thermal Receipt Slip & Reprint State (Requirement 7) ────────────────
    const [showThermalModal, setShowThermalModal] = useState(false);
    const [thermalInvoice, setThermalInvoice] = useState(null);
    const [thermalPrinterType, setThermalPrinterType] = useState('generic'); // 'generic' | 'epson' | 'tvs'
    const [thermalLoading, setThermalLoading] = useState(false);
    const [thermalPreviewUrl, setThermalPreviewUrl] = useState(null);
    const [isReprintMode, setIsReprintMode] = useState(false);
    const [reprintSubmitting, setReprintSubmitting] = useState(false);

    // ── Invoice Details Modal State ─────────────────────────────────────────
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [activeDetailTab, setActiveDetailTab] = useState('details'); // 'details' | 'pdf'

    const handleOpenDetail = async (inv) => {
        setSelectedInvoice(inv);
        setShowDetailModal(true);
        setActiveDetailTab('details');
        setPdfPreviewUrl(null);

        if (inv.id && !isNaN(Number(inv.id))) {
            try {
                const fresh = await getInvoiceById(inv.id);
                if (fresh) setSelectedInvoice(fresh);
            } catch (_) {}
        }
    };

    // ── Load PDF with optional async readiness polling (Requirement 2) ──────
    const loadPdfWithStatusCheck = useCallback(async (invId, docType = 'invoice', invNum = null) => {
        if (!invId) return;
        setPdfPreviewLoading(true);
        setPdfStatusMessage('');
        try {
            // First check PDF readiness if backend indicates async generation
            try {
                const statusRes = await getInvoicePdfStatus(invId);
                if (statusRes && (statusRes.status === 'pending' || statusRes.status === 'generating' || statusRes.status === 'queued')) {
                    setPdfStatusPolling(true);
                    setPdfStatusMessage(`PDF generation in progress (${statusRes.status}). Checking status…`);
                    
                    // Poll pdf-status endpoint up to 8 times every 2 seconds
                    let pollCount = 0;
                    let isReady = false;
                    while (pollCount < 8 && !isReady) {
                        await new Promise((resolve) => setTimeout(resolve, 2000));
                        pollCount++;
                        try {
                            const check = await getInvoicePdfStatus(invId);
                            if (check && (check.status === 'ready' || check.pdf_url)) {
                                isReady = true;
                                break;
                            }
                        } catch (_) {}
                    }
                    setPdfStatusPolling(false);
                }
            } catch (_) {
                // PDF status endpoint is optional or already ready
            }

            const res = await previewInvoicePdf(invId, { document_type: docType, invoiceNumber: invNum });
            if (res?.url) {
                setPdfPreviewUrl(res.url);
            } else {
                throw new Error('PDF stream could not be loaded.');
            }
        } catch (err) {
            showAlert(`Could not load PDF document: ${err.message}`, 'error');
        } finally {
            setPdfPreviewLoading(false);
            setPdfStatusPolling(false);
        }
    }, []);

    // ── Open Dedicated PDF Preview & Print Modal (Requirement 2) ───────────
    const openPdfPreviewModal = async (inv, docType = 'invoice') => {
        if (!inv) return;
        setPdfPreviewInvoice(inv);
        setPdfDocType(docType);
        setPdfPreviewUrl(null);
        setShowPdfPreviewModal(true);

        let latestInv = inv;
        if (inv.id) {
            try {
                const fresh = await getInvoiceById(inv.id);
                if (fresh) {
                    latestInv = fresh;
                    setPdfPreviewInvoice(fresh);
                }
            } catch (_) {}
        }

        await loadPdfWithStatusCheck(latestInv.id, docType, latestInv.invoice_number);
    };

    // ── Reliable Browser PDF Print Workflow (Requirement 2) ─────────────────
    const handlePrintPdf = () => {
        if (previewIframeRef.current && previewIframeRef.current.contentWindow) {
            try {
                previewIframeRef.current.contentWindow.focus();
                previewIframeRef.current.contentWindow.print();
                return;
            } catch (_) {}
        }
        
        // Fallback: open clean printable blob window
        if (pdfPreviewUrl) {
            const printWin = window.open(pdfPreviewUrl, '_blank');
            if (printWin) {
                printWin.onload = () => {
                    try { printWin.print(); } catch (_) {}
                };
            } else {
                showAlert('Pop-up window blocked. Please allow pop-ups to print this invoice.', 'error');
            }
        } else {
            showAlert('PDF preview is still loading. Please wait…', 'info');
        }
    };

    // ── PDF Download Handler (Blob & Auth Handling) ─────────────────────────
    const [downloadingId, setDownloadingId] = useState(null);

    const handleDownload = async (invId, docType = 'invoice', invNumber = null) => {
        if (!invId || downloadingId) return;
        setDownloadingId(invId);
        try {
            await downloadInvoicePdf(invId, { document_type: docType, invoiceNumber: invNumber });
            showAlert(`Downloaded ${docType === 'bill' ? 'POS Bill' : 'Tax Invoice'} PDF for #${invNumber || invId}!`, 'success');
        } catch (err) {
            showAlert(err.message || 'Error downloading PDF.', 'error');
        } finally {
            setDownloadingId(null);
        }
    };

    // ── Top Action: Download Invoice Button (Requirement 3) ─────────────────
    const handleTopDownloadClick = () => {
        if (selectedTableInvoiceId) {
            const target = selectedTableInvoice || { id: selectedTableInvoiceId };
            handleDownload(target.id, 'invoice', target.invoice_number);
        } else {
            setShowDownloadModal(true);
            setDownloadLookupResult(null);
            setDownloadLookupError('');
        }
    };

    // ── Download Modal Lookup by Invoice Number (GET /invoices/by-number/{num}) ─
    const handleDownloadModalLookup = async () => {
        const query = downloadSearchNumber.trim();
        if (!query) {
            setDownloadLookupError('Please enter an invoice number to lookup.');
            return;
        }
        setDownloadLookupLoading(true);
        setDownloadLookupError('');
        setDownloadLookupResult(null);

        try {
            const found = await getInvoiceByNumber(query);
            if (found) {
                setDownloadLookupResult(found);
            } else {
                setDownloadLookupError(`No tax invoice found with number "${query}".`);
            }
        } catch (err) {
            // If direct by-number lookup fails, fallback to searchInvoices
            try {
                const searchRes = await searchInvoices({ invoice_number: query });
                const list = Array.isArray(searchRes) ? searchRes : (searchRes?.data || []);
                const match = list.find(it => String(it.invoice_number).toLowerCase() === query.toLowerCase());
                if (match) {
                    setDownloadLookupResult(match);
                } else {
                    setDownloadLookupError(err.message || `No invoice found for "${query}".`);
                }
            } catch (_) {
                setDownloadLookupError(err.message || `No invoice found for "${query}".`);
            }
        } finally {
            setDownloadLookupLoading(false);
        }
    };

    // ── Open Thermal Receipt Modal (GET /invoices/{id}/thermal) ─────────────
    const openThermalModal = async (inv) => {
        if (!inv?.id) return;
        setThermalInvoice(inv);
        setShowThermalModal(true);
        setThermalLoading(true);
        setIsReprintMode(false);
        setThermalPreviewUrl(null);

        try {
            const res = await getInvoiceThermal(inv.id, {
                mode: 'preview',
                printer_type: thermalPrinterType,
                is_reprint: false,
            });
            if (res?.url) {
                setThermalPreviewUrl(res.url);
            }
        } catch (err) {
            showAlert(err.message || 'Error loading thermal preview.', 'error');
        } finally {
            setThermalLoading(false);
        }
    };

    // ── Thermal Receipt: Switch Printer Type & Reload ───────────────────────
    const handleThermalPrinterChange = async (newType) => {
        setThermalPrinterType(newType);
        if (!thermalInvoice?.id) return;
        setThermalLoading(true);
        try {
            const res = await getInvoiceThermal(thermalInvoice.id, {
                mode: 'preview',
                printer_type: newType,
                is_reprint: isReprintMode,
            });
            if (res?.url) {
                setThermalPreviewUrl(res.url);
            }
        } catch (err) {
            showAlert(err.message || 'Error updating thermal preview.', 'error');
        } finally {
            setThermalLoading(false);
        }
    };

    // ── Reprint Thermal Slip with DUPLICATE header (POST /invoices/{id}/reprint) ─
    const handleReprintReceipt = async () => {
        if (!thermalInvoice?.id || reprintSubmitting) return;
        setReprintSubmitting(true);
        try {
            const res = await reprintInvoice(
                thermalInvoice.id,
                { printer_type: thermalPrinterType, mode: 'preview' },
                { mode: 'preview' }
            );

            if (res?.url) {
                setThermalPreviewUrl(res.url);
                setIsReprintMode(true);
                showAlert(`Reprint slip generated with *** DUPLICATE / REPRINT *** header!`, 'success');
            } else {
                showAlert(res?.message || `Reprint dispatched to ${thermalPrinterType} printer!`, 'success');
            }
        } catch (err) {
            showAlert(err.message || 'Failed to dispatch reprint.', 'error');
        } finally {
            setReprintSubmitting(false);
        }
    };

    // ── Download Raw 80mm ESC/POS Text Stream ──────────────────────────────
    const handleDownloadThermalEscPos = async () => {
        if (!thermalInvoice?.id) return;
        try {
            const res = await getInvoiceThermal(thermalInvoice.id, {
                mode: 'download',
                printer_type: thermalPrinterType,
                is_reprint: isReprintMode,
            });
            if (typeof res === 'string') {
                const blob = new Blob([res], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Thermal_Receipt_${thermalInvoice.invoice_number || thermalInvoice.id}.txt`;
                a.click();
                setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            }
            showAlert('Thermal ESC/POS receipt stream downloaded!', 'success');
        } catch (err) {
            showAlert(err.message || 'Failed to download ESC/POS text stream.', 'error');
        }
    };

    // ── Download 80mm Thermal Receipt PDF ──────────────────────────────────
    const handleDownloadThermalPdf = async () => {
        if (!thermalInvoice?.id) return;
        try {
            const res = await getInvoiceThermal(thermalInvoice.id, {
                mode: 'pdf',
                printer_type: thermalPrinterType,
                is_reprint: isReprintMode,
            });
            if (res?.url) {
                const a = document.createElement('a');
                a.href = res.url;
                a.download = `Thermal_Slip_${thermalInvoice.invoice_number || thermalInvoice.id}.pdf`;
                a.click();
                setTimeout(() => window.URL.revokeObjectURL(res.url), 1000);
            }
            showAlert('Thermal 80mm PDF receipt downloaded!', 'success');
        } catch (err) {
            showAlert(err.message || 'Failed to download thermal PDF.', 'error');
        }
    };

    // ── Async Generation Handler (POST /api/v1/invoices/{id}/generate-async) ──
    const [asyncLoadingId, setAsyncLoadingId] = useState(null);
    const [asyncTaskInfo, setAsyncTaskInfo] = useState(null);

    const handleGenerateAsync = async (invId) => {
        if (!invId || asyncLoadingId) return;
        setAsyncLoadingId(invId);
        try {
            const res = await generateInvoiceAsync(invId);
            setAsyncTaskInfo(res);
            showAlert(`Background PDF generation queued! Task ID: ${res?.task_id || 'Queued'}`, 'info');
        } catch (err) {
            showAlert(err.message || 'Error triggering async generation.', 'error');
        } finally {
            setAsyncLoadingId(null);
        }
    };

    // ── Void / Cancel Invoice (POST /api/v1/invoices/{id}/void) (Requirement 8) ─
    const [showVoidModal, setShowVoidModal] = useState(false);
    const [voidTargetInvoice, setVoidTargetInvoice] = useState(null);
    const [voidReason, setVoidReason] = useState('Customer cancelled at counter');
    const [voidLoading, setVoidLoading] = useState(false);

    const openVoidModal = (inv) => {
        setVoidTargetInvoice(inv);
        setVoidReason('Customer cancelled at counter');
        setShowVoidModal(true);
    };

    const handleVoidSubmit = async () => {
        if (!voidTargetInvoice?.id || voidLoading) return;
        setVoidLoading(true);
        try {
            const updated = await voidInvoice(voidTargetInvoice.id, voidReason);
            showAlert(`Invoice #${voidTargetInvoice.invoice_number || voidTargetInvoice.id} successfully cancelled and voided!`, 'success');
            setShowVoidModal(false);
            
            // Refresh list from server and update local state
            await fetchInvoicesList();

            if (selectedInvoice && String(selectedInvoice.id) === String(voidTargetInvoice.id)) {
                setSelectedInvoice((prev) => ({
                    ...prev,
                    status: updated?.status || 'cancelled',
                }));
            }
        } catch (err) {
            showAlert(err.message || 'Failed to void invoice.', 'error');
        } finally {
            setVoidLoading(false);
        }
    };

    // ── Create Invoice Modal State (Form helpers & submission) ──

    // Helper to calculate estimated total from line items and tax
    const calculateEstimatedGrandTotal = (items, sameState = true) => {
        let subtotal = 0;
        let discount = 0;
        items.forEach(it => {
            const p = Number(it.unit_price || 0);
            const q = Number(it.quantity || 1);
            const d = Number(it.discount || 0);
            subtotal += p * q;
            discount += d;
        });
        const taxable = Math.max(0, subtotal - discount);
        const tax = (taxable * 18) / 100;
        return Math.round((taxable + tax) * 100) / 100;
    };

    // Helper to update line items and auto-sync payments if single split
    const updateItemsAndAutoSyncPayments = (updatedItems) => {
        let updatedPayments = newInvoiceData.payments;
        if (newInvoiceData.payments.length === 1) {
            const newTotal = calculateEstimatedGrandTotal(updatedItems, newInvoiceData.same_state);
            const isCash = newInvoiceData.payments[0].payment_mode === 'cash';
            const tendered = isCash ? Math.ceil(newTotal) : newTotal;
            const change = isCash ? Math.max(0, Math.round((tendered - newTotal) * 100) / 100) : 0;
            updatedPayments = [
                {
                    ...newInvoiceData.payments[0],
                    amount: newTotal,
                    amount_tendered: tendered,
                    change_due: change,
                }
            ];
        }
        setNewInvoiceData({
            ...newInvoiceData,
            items: updatedItems,
            payments: updatedPayments,
        });
    };

    // Open Create Modal with fresh, perfectly synchronized defaults
    const handleOpenCreateModal = () => {
        setCreateError('');
        const firstStore = availableStores.length > 0 ? availableStores[0].id : 1;
        const firstProd = availableProducts.length > 0 ? availableProducts[0] : null;
        const prodId = firstProd ? firstProd.id : 1;
        const price = firstProd ? Number(firstProd.price || firstProd.selling_price || 500) : 500;
        const lineTotal = price;
        const grandTotal = Math.round((lineTotal + (lineTotal * 0.18)) * 100) / 100;

        setNewInvoiceData({
            store_id: firstStore,
            customer_id: null,
            same_state: true,
            items: [
                {
                    product_id: prodId,
                    quantity: 1,
                    unit_price: price,
                    discount: 0,
                }
            ],
            payments: [
                {
                    payment_mode: 'cash',
                    amount: grandTotal,
                    transaction_reference: '',
                    amount_tendered: Math.ceil(grandTotal),
                    change_due: Math.max(0, Math.round((Math.ceil(grandTotal) - grandTotal) * 100) / 100),
                }
            ]
        });
        setShowCreateModal(true);
    };

    // Populate create invoice form with items from active POS cart
    const handlePopulateFromCart = () => {
        if (!liveCart || !liveCart.items || liveCart.items.length === 0) return;
        const cartItems = liveCart.items.map(it => ({
            product_id: it.product_id || 1,
            quantity: it.quantity || 1,
            unit_price: Number(it.unit_price) || 0,
            discount: Number(it.discount) || 0,
        }));
        const grandTotal = Number(liveCart.grand_total) || 0;
        setNewInvoiceData(prev => ({
            ...prev,
            store_id: liveCart.store_id || prev.store_id,
            items: cartItems,
            payments: [
                { payment_mode: 'cash', amount: grandTotal, transaction_reference: '', amount_tendered: grandTotal, change_due: 0 }
            ]
        }));
        showAlert(`Imported ${cartItems.length} item(s) from active POS cart!`, 'info');
    };

    // Live Totals Calculations for Create Invoice Form
    const createTotals = useMemo(() => {
        let itemsSubtotal = 0;
        let totalDiscount = 0;

        newInvoiceData.items.forEach((item) => {
            const price = Number(item.unit_price || 0);
            const qty = Number(item.quantity || 1);
            const disc = Number(item.discount || 0);
            itemsSubtotal += price * qty;
            totalDiscount += disc;
        });

        const taxableAmount = Math.max(0, itemsSubtotal - totalDiscount);
        // Standard Indian GST rate estimation (18%)
        const taxRate = 18;
        const totalTax = (taxableAmount * taxRate) / 100;
        const cgst = newInvoiceData.same_state ? totalTax / 2 : 0;
        const sgst = newInvoiceData.same_state ? totalTax / 2 : 0;
        const igst = newInvoiceData.same_state ? 0 : totalTax;
        const grandTotal = taxableAmount + totalTax;

        const totalPayments = newInvoiceData.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const paymentDifference = totalPayments - grandTotal;

        return {
            itemsSubtotal,
            totalDiscount,
            taxableAmount,
            cgst,
            sgst,
            igst,
            totalTax,
            grandTotal,
            totalPayments,
            paymentDifference,
        };
    }, [newInvoiceData.items, newInvoiceData.payments, newInvoiceData.same_state]);

    const handleCreateInvoiceSubmit = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError('');
        try {
            if (!newInvoiceData.store_id || Number(newInvoiceData.store_id) <= 0) {
                throw new Error('Please select or enter a valid Store ID (must be > 0).');
            }
            if (newInvoiceData.items.length === 0) {
                throw new Error('Please add at least one line item.');
            }

            const payload = {
                store_id: Number(newInvoiceData.store_id) || 1,
                customer_id: newInvoiceData.customer_id !== null && newInvoiceData.customer_id !== '' 
                    ? Number(newInvoiceData.customer_id) 
                    : null,
                same_state: Boolean(newInvoiceData.same_state),
                items: newInvoiceData.items.map((it) => ({
                    product_id: Number(it.product_id) || 1,
                    quantity: Number(it.quantity) || 1,
                    unit_price: Number(it.unit_price) || 0,
                    discount: Number(it.discount) || 0,
                })),
                payments: newInvoiceData.payments.map((p) => {
                    let mode = (p.payment_mode || 'cash').toLowerCase().trim();
                    if (mode === 'netbanking' || mode === 'net_banking') mode = 'card';
                    const allowed = ['cash', 'upi', 'card', 'credit_card', 'debit_card', 'wallet', 'qr'];
                    if (!allowed.includes(mode)) mode = 'cash';
                    return {
                        payment_mode: mode,
                        amount: Number(p.amount) || 0,
                        transaction_reference: p.transaction_reference ? String(p.transaction_reference).trim() : null,
                        amount_tendered: p.amount_tendered !== null && p.amount_tendered !== '' ? Number(p.amount_tendered) : null,
                        change_due: p.change_due !== null && p.change_due !== '' ? Number(p.change_due) : null,
                    };
                }),
            };

            const created = await createInvoice(payload);
            showAlert(`Tax Invoice #${created?.invoice_number || created?.id} created successfully!`, 'success');
            setShowCreateModal(false);

            if (created) {
                setInvoices((prev) => [created, ...prev]);
                setSelectedInvoice(created);
                setShowDetailModal(true);
            }
            fetchInvoicesList();
        } catch (err) {
            setCreateError(err.message || 'Failed to create tax invoice.');
            showAlert(`Failed to create invoice: ${err.message}`, 'error');
        } finally {
            setCreateLoading(false);
        }
    };

    // ── Filtered & Paginated Invoices ──────────────────────────────────────
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const invNum = String(inv.invoice_number || inv.id || '').toLowerCase();
            const custName = String(inv.customer_name || inv.customer || '').toLowerCase();
            const phone = String(inv.customer_phone || inv.mobile || inv.phone || '');
            const gstin = String(inv.customer_gstin || inv.gstin || '').toLowerCase();
            const status = String(inv.status || '').toLowerCase();

            if (debouncedSearch) {
                const s = debouncedSearch.toLowerCase();
                const matchesNum = invNum.includes(s);
                const matchesCust = custName.includes(s);
                const matchesPhone = phone.includes(s);
                if (!matchesNum && !matchesCust && !matchesPhone) return false;
            }

            if (searchFilters.invoice_number && !invNum.includes(searchFilters.invoice_number.toLowerCase())) return false;
            if (searchFilters.customer_name && !custName.includes(searchFilters.customer_name.toLowerCase())) return false;
            if (searchFilters.mobile && !phone.includes(searchFilters.mobile)) return false;
            if (searchFilters.gstin && !gstin.includes(searchFilters.gstin.toLowerCase())) return false;
            if (searchFilters.payment_status !== 'All' && status !== searchFilters.payment_status.toLowerCase()) return false;
            if (searchFilters.store_id && String(inv.store_id) !== String(searchFilters.store_id)) return false;

            return true;
        });
    }, [invoices, debouncedSearch, searchFilters]);

    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / perPage));
    const paginatedInvoices = filteredInvoices.slice((page - 1) * perPage, page * perPage);

    // ── Dashboard Summary Cards (KPIs from Actual API Data) ─────────────────
    const kpiSummary = useMemo(() => {
        const total = invoices.length;
        const paidCount = invoices.filter((i) => {
            const st = String(i.status || '').toLowerCase();
            return st === 'paid' || st === 'completed' || st === 'issued';
        }).length;

        const pendingCount = invoices.filter((i) => {
            const st = String(i.status || '').toLowerCase();
            return st === 'pending' || st === 'unpaid' || st === 'partial';
        }).length;

        const validBilledInvoices = invoices.filter((i) => {
            const st = String(i.status || '').toLowerCase();
            return st !== 'cancelled' && st !== 'returned' && st !== 'failed';
        });

        const totalBilledAmount = validBilledInvoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);

        return {
            totalInvoices: total,
            paidInvoices: paidCount,
            pendingPayments: pendingCount,
            totalBilledAmount: totalBilledAmount,
        };
    }, [invoices]);

    // Monthly chart trends from actual invoices
    const chartTrend = useMemo(() => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = d.toISOString().slice(0, 7);
            const label = d.toLocaleString('en-US', { month: 'short' });
            months.push({ key, month: label, invoices: 0, gst: 0, revenue: 0 });
        }

        invoices.forEach((inv) => {
            const dateStr = inv.created_at || inv.date;
            if (!dateStr) return;
            const key = String(dateStr).slice(0, 7);
            const item = months.find((m) => m.key === key);
            if (item) {
                item.invoices += 1;
                const st = String(inv.status || '').toLowerCase();
                if (st !== 'cancelled' && st !== 'returned') {
                    const gst = (Number(inv.cgst_amount || 0) + Number(inv.sgst_amount || 0) + Number(inv.igst_amount || 0));
                    item.gst += gst;
                    item.revenue += Number(inv.total_amount || 0);
                }
            }
        });

        return months.map((m) => ({
            ...m,
            gst: Math.round(m.gst * 100) / 100,
            revenue: Math.round(m.revenue * 100) / 100,
        }));
    }, [invoices]);

    // CSV Export
    const handleExportCsv = () => {
        const headers = ['Invoice Number', 'Invoice ID', 'Order ID', 'Customer Name', 'Date', 'Store ID', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Grand Total', 'Status'];
        const rows = filteredInvoices.map((inv) => [
            `"${inv.invoice_number || `INV-${inv.id}`}"`,
            inv.id,
            inv.order_id || '—',
            `"${inv.customer_name || 'Walk-in Customer'}"`,
            `"${inv.created_at || ''}"`,
            inv.store_id || 1,
            inv.subtotal || 0,
            inv.cgst_amount || 0,
            inv.sgst_amount || 0,
            inv.igst_amount || 0,
            inv.total_amount || 0,
            inv.status || 'issued',
        ]);
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `retail_os_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="dash-page">
            {/* Top Alert Toast */}
            {alertMsg && (
                <div
                    style={{
                        position: 'fixed',
                        top: 24,
                        right: 28,
                        zIndex: 9999,
                        background: alertMsg.type === 'error' ? '#ef4444' : alertMsg.type === 'info' ? '#3b82f6' : '#10b981',
                        color: '#fff',
                        padding: '12px 20px',
                        borderRadius: 10,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 600,
                        fontSize: 13,
                        animation: 'fadeIn 0.2s ease',
                    }}
                >
                    {alertMsg.type === 'error' ? <BsXCircleFill size={16} /> : <BsCheckCircleFill size={16} />}
                    <span>{alertMsg.text}</span>
                    <button
                        onClick={() => setAlertMsg(null)}
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: 8 }}
                    >
                        <BsX size={18} />
                    </button>
                </div>
            )}

            {/* =================================================================
               1. HEADER
               ================================================================= */}
            <div className="adm-page-header">
                <div>
                    <h1 className="adm-page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BsFileEarmarkText size={26} color="#6366f1" />
                        Invoices
                    </h1>
                    <p className="adm-page-sub">
                        Tax invoices, invoice status, and billing history
                    </p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        id="refresh-invoices-btn"
                        onClick={fetchInvoicesList}
                        disabled={loadingInvoices}
                        className="adm-btn-secondary"
                        title="Reload latest invoices from server"
                    >
                        <BsArrowRepeat size={14} className={loadingInvoices ? 'spin' : ''} />
                        {loadingInvoices ? 'Refreshing…' : 'Refresh'}
                    </button>
                    <button
                        id="export-invoices-btn"
                        onClick={handleExportCsv}
                        className="adm-btn-secondary"
                        title="Export current invoice records to CSV"
                    >
                        <BsDownload size={14} /> Export CSV
                    </button>
                    <button
                        id="download-invoice-btn"
                        onClick={handleTopDownloadClick}
                        className="adm-btn-secondary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            fontWeight: 600,
                            background: selectedTableInvoiceId ? '#ecfdf5' : '#f8fafc',
                            color: selectedTableInvoiceId ? '#059669' : '#0f172a',
                            border: selectedTableInvoiceId ? '1px solid #10b981' : '1px solid #cbd5e1',
                            boxShadow: selectedTableInvoiceId ? '0 2px 8px rgba(16, 185, 129, 0.2)' : 'none',
                            cursor: 'pointer',
                        }}
                        title={selectedTableInvoiceId 
                            ? `Download Tax Invoice PDF for Selected #${selectedTableInvoice?.invoice_number || selectedTableInvoiceId}`
                            : "Download Invoice PDF or Lookup by Number (GET /invoices/by-number)"}
                    >
                        <BsDownload size={14} color={selectedTableInvoiceId ? '#059669' : '#4f46e5'} />
                        Download Invoice
                        {selectedTableInvoiceId && (
                            <span style={{ 
                                background: '#10b981', 
                                color: '#fff', 
                                fontSize: 10, 
                                padding: '2px 7px', 
                                borderRadius: 999, 
                                fontWeight: 700 
                            }}>
                                Selected #{selectedTableInvoice?.invoice_number ? selectedTableInvoice.invoice_number.slice(-6) : selectedTableInvoiceId}
                            </span>
                        )}
                    </button>
                    <button
                        id="create-invoice-btn"
                        onClick={handleOpenCreateModal}
                        className="adm-btn-primary"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        }}
                    >
                        <BsPlusCircle size={15} /> Create Invoice
                    </button>
                </div>
            </div>

            {/* =================================================================
               2. DASHBOARD SUMMARY CARDS (Actual API Data)
               ================================================================= */}
            <div className="adm-kpi-grid">
                {/* 1. Total Invoices */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                            <BsFileEarmarkText size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Total Invoices</p>
                    <p className="adm-kpi-value">{kpiSummary.totalInvoices}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                        All tax invoices in system
                    </p>
                </div>

                {/* 2. Paid Invoices */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                            <BsCheckCircleFill size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Paid Invoices</p>
                    <p className="adm-kpi-value" style={{ color: '#10b981' }}>{kpiSummary.paidInvoices}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                        Issued &amp; fully settled transactions
                    </p>
                </div>

                {/* 3. Pending Payments */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
                            <BsHourglassSplit size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Pending Payments</p>
                    <p className="adm-kpi-value" style={{ color: '#d97706' }}>{kpiSummary.pendingPayments}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                        Unpaid or partially settled invoices
                    </p>
                </div>

                {/* 4. Total Billed Amount */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
                            <BsCurrencyRupee size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Total Billed Amount</p>
                    <p className="adm-kpi-value" style={{ color: '#0f172a' }}>{fmt(kpiSummary.totalBilledAmount)}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', fontWeight: 500 }}>
                        Net revenue from valid invoices
                    </p>
                </div>
            </div>

            {/* Live Cart Banner (if POS cart has active items) */}
            {!cartLoading && liveCart && liveCart.items && liveCart.items.length > 0 && (
                <div
                    className="chart-card"
                    style={{
                        background: 'linear-gradient(to right, #f8fafc, #eff6ff)',
                        borderColor: '#bfdbfe',
                        padding: '14px 20px',
                        marginBottom: 16,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ background: '#4f46e5', color: '#fff', borderRadius: 10, padding: 10 }}>
                                <BsCartCheck size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                                    Active POS Cart: {liveCart.items.length} item{liveCart.items.length !== 1 ? 's' : ''} ({fmt(liveCart.grand_total)})
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                                    Store #{liveCart.store_id || 1} &nbsp;·&nbsp;
                                    Subtotal: {fmt(liveCart.subtotal)} | Tax: {fmt(liveCart.gst_amount)}
                                </p>
                            </div>
                        </div>
                        <button
                            id="convert-cart-to-invoice-btn"
                            onClick={() => {
                                handlePopulateFromCart();
                                setShowCreateModal(true);
                            }}
                            className="adm-btn-primary"
                            style={{ background: '#4f46e5', fontSize: 12, padding: '7px 14px' }}
                        >
                            Convert Cart to Tax Invoice ›
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Invoice / Order ID Direct Lookup */}
            <div className="chart-card" style={{ padding: '14px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BsBoxArrowUpRight size={15} color="#4f46e5" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Direct Invoice or Order ID Lookup</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Fetch invoice record directly via GET /api/v1/invoices/{'{id}'}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 260, display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px' }}>
                        <BsSearch size={13} color="#94a3b8" />
                        <input
                            id="quick-lookup-input"
                            type="text"
                            placeholder="Enter Invoice ID or Order ID (e.g. 101 or INV-A1B2C3D4)"
                            value={lookupId}
                            onChange={(e) => { setLookupId(e.target.value); setLookupError(''); }}
                            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '9px 8px', fontSize: 13, color: '#1e293b' }}
                        />
                        {lookupId && (
                            <button onClick={() => setLookupId('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <BsX size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        id="quick-lookup-btn"
                        onClick={handleLookup}
                        disabled={lookupLoading}
                        className="adm-btn-primary"
                        style={{ padding: '9px 18px', fontSize: 13 }}
                    >
                        {lookupLoading ? 'Fetching…' : 'Fetch Invoice Details'}
                    </button>
                </div>
                {lookupError && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, fontWeight: 500 }}>
                        <BsExclamationTriangleFill size={12} /> {lookupError}
                    </div>
                )}
            </div>

            {/* Monthly Trend Analytics Charts */}
            <div className="dash-charts-row" style={{ marginBottom: 16 }}>
                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly Invoice Generation</h2>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Volume of invoices raised</span>
                    </div>
                    <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={chartTrend} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                            <Bar dataKey="invoices" name="Invoices" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-card">
                    <div className="chart-card-header">
                        <h2 className="chart-title">Monthly GST Collection Trend</h2>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>Total GST amount collected (₹)</span>
                    </div>
                    <ResponsiveContainer width="100%" height={170}>
                        <LineChart data={chartTrend} margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => fmt(v)} />
                            <Line type="monotone" dataKey="gst" name="GST" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* =================================================================
               3. SEARCH & FILTERS + INVOICE HISTORY TABLE
               ================================================================= */}
            <div className="chart-card">
                {/* Search & Filters Toolbar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        {/* Search input (debounced) */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
                            <div className="adm-search-wrap" style={{ flex: 1 }}>
                                <BsSearch size={13} className="adm-search-icon" />
                                <input
                                    id="invoice-search-filter-input"
                                    className="adm-search"
                                    placeholder="Search by invoice number or customer name…"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => { setSearchTerm(''); setPage(1); }}
                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', paddingRight: 8 }}
                                    >
                                        <BsX size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Payment Status Dropdown Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <select
                                id="payment-status-select"
                                className="chart-period-select"
                                value={searchFilters.payment_status}
                                onChange={(e) => {
                                    setSearchFilters((prev) => ({ ...prev, payment_status: e.target.value }));
                                    setPage(1);
                                }}
                                style={{ minWidth: 140 }}
                            >
                                <option value="All">All Statuses</option>
                                <option value="issued">Issued</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="unpaid">Unpaid</option>
                                <option value="partial">Partial</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="returned">Returned</option>
                                <option value="failed">Failed</option>
                            </select>

                            {/* Store ID Filter */}
                            <select
                                id="store-filter-select"
                                className="chart-period-select"
                                value={searchFilters.store_id}
                                onChange={(e) => {
                                    setSearchFilters((prev) => ({ ...prev, store_id: e.target.value }));
                                    setPage(1);
                                }}
                                style={{ minWidth: 130 }}
                            >
                                <option value="">All Stores</option>
                                {availableStores.length > 0 ? (
                                    availableStores.map(st => (
                                        <option key={st.id} value={st.id}>
                                            Store #{st.id} ({st.name || st.store_name || 'Outlet'})
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="1">Store #1</option>
                                        <option value="2">Store #2</option>
                                    </>
                                )}
                            </select>

                            {/* Expandable Advanced Filters Toggle */}
                            <button
                                id="toggle-advanced-filters-btn"
                                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                                className="adm-btn-secondary"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    borderColor: showAdvancedFilters ? '#6366f1' : undefined,
                                    color: showAdvancedFilters ? '#6366f1' : undefined,
                                }}
                            >
                                <BsSliders size={13} />
                                {showAdvancedFilters ? 'Hide Filters' : 'More Filters'}
                            </button>

                            {/* Clear Filters Button */}
                            {(searchTerm ||
                                searchFilters.invoice_number ||
                                searchFilters.customer_name ||
                                searchFilters.mobile ||
                                searchFilters.gstin ||
                                searchFilters.payment_status !== 'All' ||
                                searchFilters.store_id ||
                                searchFilters.date_from ||
                                searchFilters.date_to) && (
                                <button
                                    id="reset-filters-btn"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSearchFilters({
                                            invoice_number: '',
                                            customer_name: '',
                                            mobile: '',
                                            gstin: '',
                                            payment_status: 'All',
                                            store_id: '',
                                            date_from: '',
                                            date_to: '',
                                        });
                                        setPage(1);
                                    }}
                                    className="adm-btn-secondary"
                                    style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                >
                                    <BsX size={14} /> Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Expandable Advanced Filters (Customer Mobile, GSTIN, Date From, Date To) */}
                    {showAdvancedFilters && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 12,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 10,
                                padding: '14px 16px',
                                animation: 'slideDown 0.2s ease',
                            }}
                        >
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                    Customer Mobile (10 Digits)
                                </label>
                                <input
                                    id="filter-mobile-input"
                                    type="text"
                                    placeholder="e.g. 9876543210"
                                    value={searchFilters.mobile}
                                    maxLength={10}
                                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, mobile: e.target.value.replace(/\D/g, '') }))}
                                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                    Customer GSTIN (15 Chars)
                                </label>
                                <input
                                    id="filter-gstin-input"
                                    type="text"
                                    placeholder="e.g. 27ABCDE1234F1Z5"
                                    value={searchFilters.gstin}
                                    maxLength={15}
                                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                    Date From
                                </label>
                                <input
                                    id="filter-date-from-input"
                                    type="date"
                                    value={searchFilters.date_from}
                                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                    Date To
                                </label>
                                <input
                                    id="filter-date-to-input"
                                    type="date"
                                    value={searchFilters.date_to}
                                    onChange={(e) => setSearchFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                                    style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Fetch Error Banner with Retry */}
                {fetchError && (
                    <div
                        style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '10px 14px',
                            color: '#b91c1c',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 14,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsExclamationTriangleFill size={14} />
                            <span>{fetchError}</span>
                        </div>
                        <button
                            onClick={fetchInvoicesList}
                            className="adm-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, borderColor: '#fca5a5', color: '#b91c1c' }}
                        >
                            Retry Fetch
                        </button>
                    </div>
                )}

                {/* Invoice History Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table className="dash-table" style={{ marginTop: 0, width: '100%' }}>
                        <thead>
                            <tr>
                                <th style={{ width: 44, textAlign: 'center' }}>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Select</span>
                                </th>
                                <th>Invoice Number</th>
                                <th>Customer Name</th>
                                <th>Invoice Date</th>
                                <th>Store</th>
                                <th>Taxable Amount</th>
                                <th>CGST</th>
                                <th>SGST</th>
                                <th>IGST</th>
                                <th>Grand Total</th>
                                <th>Payment Status</th>
                                <th style={{ textAlign: 'center', minWidth: 230 }}>Available Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingInvoices ? (
                                <tr>
                                    <td colSpan={12} style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                            <BsArrowRepeat size={24} className="spin" color="#4f46e5" />
                                            <span style={{ fontSize: 14, fontWeight: 600 }}>Fetching invoice records from server…</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={12} style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                            <BsFileEarmarkText size={32} color="#cbd5e1" />
                                            <div>
                                                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#334155' }}>
                                                    No invoices found
                                                </p>
                                                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>
                                                    No records matched your search parameters. Click <b>+ Create Invoice</b> to generate a new invoice.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => setShowCreateModal(true)}
                                                className="adm-btn-primary"
                                                style={{ fontSize: 12, padding: '7px 16px' }}
                                            >
                                                <BsPlusCircle size={13} /> Create Tax Invoice
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((inv, idx) => {
                                    const invId = inv.id;
                                    const invNumber = inv.invoice_number || `INV-${inv.id}`;
                                    const dateStr = formatDate(inv.created_at || inv.date);
                                    const cgst = Number(inv.cgst_amount || 0);
                                    const sgst = Number(inv.sgst_amount || 0);
                                    const igst = Number(inv.igst_amount || 0);
                                    const isSelected = String(selectedTableInvoiceId) === String(invId);

                                    return (
                                        <tr 
                                            key={inv.id || idx}
                                            style={{
                                                background: isSelected ? '#f5f3ff' : undefined,
                                                transition: 'background-color 0.15s ease',
                                            }}
                                        >
                                            {/* Row Radio Selection */}
                                            <td style={{ textAlign: 'center' }}>
                                                <input
                                                    type="radio"
                                                    name="selected_invoice_row"
                                                    checked={isSelected}
                                                    onChange={() => setSelectedTableInvoiceId(prev => String(prev) === String(invId) ? null : invId)}
                                                    onClick={() => setSelectedTableInvoiceId(prev => String(prev) === String(invId) ? null : invId)}
                                                    style={{ cursor: 'pointer', accentColor: '#4f46e5', width: 16, height: 16 }}
                                                    title="Select this invoice to download or preview"
                                                />
                                            </td>

                                            {/* Invoice Number */}
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 13 }}>
                                                        {invNumber}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                                        ID: #{inv.id} {inv.order_id ? `· Ord: #${inv.order_id}` : ''}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Customer Name */}
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                                        {inv.customer_name || inv.customer || 'Walk-in Customer'}
                                                    </span>
                                                    {inv.customer_phone && inv.customer_phone !== '—' && (
                                                        <span style={{ fontSize: 10, color: '#64748b' }}>📞 {inv.customer_phone}</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Invoice Date */}
                                            <td>
                                                <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                                                    {dateStr}
                                                </span>
                                            </td>

                                            {/* Store */}
                                            <td>
                                                <span className="dash-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: 11, fontWeight: 600 }}>
                                                    Store #{inv.store_id || 1}
                                                </span>
                                            </td>

                                            {/* Taxable Amount */}
                                            <td>
                                                <span style={{ fontWeight: 600, color: '#1e293b' }}>
                                                    {fmt(inv.subtotal)}
                                                </span>
                                            </td>

                                            {/* CGST */}
                                            <td>
                                                <span style={{ fontWeight: 500, color: '#0ea5e9', fontSize: 12 }}>
                                                    {fmt(cgst)}
                                                </span>
                                            </td>

                                            {/* SGST */}
                                            <td>
                                                <span style={{ fontWeight: 500, color: '#0ea5e9', fontSize: 12 }}>
                                                    {fmt(sgst)}
                                                </span>
                                            </td>

                                            {/* IGST */}
                                            <td>
                                                <span style={{ fontWeight: 500, color: '#f59e0b', fontSize: 12 }}>
                                                    {fmt(igst)}
                                                </span>
                                            </td>

                                            {/* Grand Total */}
                                            <td>
                                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                                                    {fmt(inv.total_amount)}
                                                </span>
                                            </td>

                                            {/* Payment Status */}
                                            <td>{getStatusBadge(inv.status)}</td>

                                            {/* Available Actions */}
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                                                    {/* 1. View Invoice Details */}
                                                    <button
                                                        id={`btn-view-${invId}`}
                                                        onClick={() => handleOpenDetail(inv)}
                                                        className="adm-action-btn"
                                                        title="Retrieve Complete Details (GET /api/v1/invoices/{invoice_id})"
                                                        style={{ background: '#eef2ff', color: '#4f46e5' }}
                                                    >
                                                        <BsEyeFill size={13} />
                                                    </button>

                                                    {/* 2. Preview & Print Invoice (Requirement 2) */}
                                                    <button
                                                        id={`btn-preview-print-${invId}`}
                                                        onClick={() => openPdfPreviewModal(inv, 'invoice')}
                                                        className="adm-action-btn"
                                                        title="Preview & Print Invoice (GET /api/v1/invoices/{invoice_id}/pdf)"
                                                        style={{ background: '#eff6ff', color: '#2563eb' }}
                                                    >
                                                        <BsPrinter size={13} />
                                                    </button>

                                                    {/* 3. Download Tax Invoice PDF */}
                                                    <button
                                                        id={`btn-download-pdf-${invId}`}
                                                        onClick={() => handleDownload(invId, 'invoice', invNumber)}
                                                        disabled={downloadingId === invId}
                                                        className="adm-action-btn"
                                                        title="Download Tax Invoice PDF (GET /api/v1/invoices/{invoice_id}/pdf?document_type=invoice)"
                                                        style={{ background: '#ecfdf5', color: '#059669' }}
                                                    >
                                                        {downloadingId === invId ? <span style={{ fontSize: 10 }}>⏳</span> : <BsFileEarmarkPdf size={13} />}
                                                    </button>

                                                    {/* 4. Download POS Bill */}
                                                    <button
                                                        id={`btn-download-bill-${invId}`}
                                                        onClick={() => handleDownload(invId, 'bill', invNumber)}
                                                        disabled={downloadingId === invId}
                                                        className="adm-action-btn"
                                                        title="Download Compact POS Bill (GET /api/v1/invoices/{invoice_id}/pdf?document_type=bill)"
                                                        style={{ background: '#f0fdf4', color: '#16a34a' }}
                                                    >
                                                        <BsReceiptCutoff size={13} />
                                                    </button>

                                                    {/* 5. Thermal Receipt Slip (80mm ESC/POS) & Reprint (Requirement 7) */}
                                                    <button
                                                        id={`btn-thermal-${invId}`}
                                                        onClick={() => openThermalModal(inv)}
                                                        className="adm-action-btn"
                                                        title="Export 80mm ESC/POS Thermal Receipt & Reprint"
                                                        style={{ background: '#fffbeb', color: '#d97706' }}
                                                    >
                                                        <BsSliders size={13} />
                                                    </button>

                                                    {/* 6. Generate Async (Requirement 7 & 2) */}
                                                    <button
                                                        id={`btn-async-${invId}`}
                                                        onClick={() => handleGenerateAsync(invId)}
                                                        disabled={asyncLoadingId === invId}
                                                        className="adm-action-btn"
                                                        title="Submit Async Generation (POST /api/v1/invoices/{invoice_id}/generate-async)"
                                                        style={{ background: '#f1f5f9', color: '#475569' }}
                                                    >
                                                        {asyncLoadingId === invId ? <span style={{ fontSize: 10 }}>⏳</span> : <BsLightningChargeFill size={12} />}
                                                    </button>

                                                    {/* 7. Void / Cancel Invoice (Requirement 8) */}
                                                    {inv.status !== 'cancelled' && inv.status !== 'void' && (
                                                        <button
                                                            id={`btn-void-${invId}`}
                                                            onClick={() => openVoidModal(inv)}
                                                            className="adm-action-btn"
                                                            title="Void / Cancel Tax Invoice (POST /api/v1/invoices/{invoice_id}/void)"
                                                            style={{ background: '#fef2f2', color: '#dc2626' }}
                                                        >
                                                            <BsTrash size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="adm-pagination" style={{ marginTop: 16 }}>
                    <p className="adm-pagination-info">
                        Showing {filteredInvoices.length === 0 ? 0 : (page - 1) * perPage + 1}–{Math.min(page * perPage, filteredInvoices.length)} of {filteredInvoices.length} invoices
                    </p>
                    <div className="adm-pagination-btns">
                        <button className="adm-pg-btn" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                            ‹ Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                className={`adm-pg-btn ${page === i + 1 ? 'adm-pg-btn--active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                        <button className="adm-pg-btn" disabled={page === totalPages || filteredInvoices.length === 0} onClick={() => setPage((p) => p + 1)}>
                            Next ›
                        </button>
                    </div>
                </div>
            </div>

            {/* =================================================================
               MODAL 1: CREATE INVOICE (POST /api/v1/invoices)
               ================================================================= */}
            {showCreateModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowCreateModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 820,
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '16px 24px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#eef2ff', color: '#4f46e5', padding: 8, borderRadius: 8 }}>
                                    <BsFileEarmarkText size={20} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                                        Create Tax Invoice
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                                        POST /api/v1/invoices · Generates compliant GST tax invoice with line items &amp; payments
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Modal Scrollable Form */}
                        <form onSubmit={handleCreateInvoiceSubmit} style={{ padding: '18px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {createError && (
                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: 8, color: '#b91c1c', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <BsExclamationTriangleFill size={14} />
                                    <span>{createError}</span>
                                </div>
                            )}

                            {/* Section 1: Store & Customer Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                                {/* Store Selector */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                        Store ID *
                                    </label>
                                    {availableStores.length > 0 ? (
                                        <select
                                            id="modal-store-select"
                                            value={newInvoiceData.store_id}
                                            onChange={(e) => setNewInvoiceData({ ...newInvoiceData, store_id: Number(e.target.value) })}
                                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        >
                                            {availableStores.map(st => (
                                                <option key={st.id} value={st.id}>
                                                    Store #{st.id} - {st.name || st.store_name || 'Retail Outlet'}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            id="modal-store-input"
                                            type="number"
                                            required
                                            min="1"
                                            value={newInvoiceData.store_id}
                                            onChange={(e) => setNewInvoiceData({ ...newInvoiceData, store_id: Number(e.target.value) })}
                                            placeholder="Store ID (e.g. 1)"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        />
                                    )}
                                </div>

                                {/* Customer Selector */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                        Customer (Optional)
                                    </label>
                                    {availableCustomers.length > 0 ? (
                                        <select
                                            id="modal-customer-select"
                                            value={newInvoiceData.customer_id ?? ''}
                                            onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customer_id: e.target.value ? Number(e.target.value) : null })}
                                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="">Walk-in Customer (None)</option>
                                            {availableCustomers.map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Customer #${c.id}`} {c.phone ? `(${c.phone})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            id="modal-customer-input"
                                            type="number"
                                            min="1"
                                            value={newInvoiceData.customer_id ?? ''}
                                            onChange={(e) => setNewInvoiceData({ ...newInvoiceData, customer_id: e.target.value ? Number(e.target.value) : null })}
                                            placeholder="Customer ID e.g. 7 (or blank for Walk-in)"
                                            style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                        />
                                    )}
                                </div>

                                {/* Same State Toggle (Intra-state vs Inter-state) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                                        Tax Jurisdiction *
                                    </label>
                                    <select
                                        id="modal-same-state-select"
                                        value={newInvoiceData.same_state ? 'true' : 'false'}
                                        onChange={(e) => setNewInvoiceData({ ...newInvoiceData, same_state: e.target.value === 'true' })}
                                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="true">Intra-State (CGST + SGST)</option>
                                        <option value="false">Inter-State (IGST)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Section 2: Line Items Management */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BsListUl size={14} color="#4f46e5" />
                                            Invoice Line Items ({newInvoiceData.items.length})
                                        </span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>
                                            API fields: product_id, quantity, unit_price, discount
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {liveCart && liveCart.items && liveCart.items.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handlePopulateFromCart}
                                                style={{
                                                    background: '#eef2ff',
                                                    border: '1px solid #c7d2fe',
                                                    borderRadius: 6,
                                                    padding: '4px 10px',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: '#4f46e5',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Import POS Cart
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            id="add-item-row-btn"
                                            onClick={() => {
                                                const defaultProd = availableProducts[0];
                                                const newItem = {
                                                    product_id: defaultProd?.id || 1,
                                                    quantity: 1,
                                                    unit_price: Number(defaultProd?.price || defaultProd?.selling_price || 100),
                                                    discount: 0
                                                };
                                                updateItemsAndAutoSyncPayments([...newInvoiceData.items, newItem]);
                                            }}
                                            style={{
                                                background: '#fff',
                                                border: '1px solid #cbd5e1',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#4f46e5',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 80px 100px 90px 110px 32px', gap: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                                    <span>Product (ID) *</span>
                                    <span>Quantity *</span>
                                    <span>Unit Price (₹) *</span>
                                    <span>Discount (₹)</span>
                                    <span>Line Total (₹)</span>
                                    <span></span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {newInvoiceData.items.map((item, itIdx) => {
                                        const lineTotal = Math.max(0, (Number(item.quantity || 1) * Number(item.unit_price || 0)) - Number(item.discount || 0));
                                        return (
                                            <div
                                                key={itIdx}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1.4fr 80px 100px 90px 110px 32px',
                                                    gap: 8,
                                                    alignItems: 'center',
                                                    background: '#fff',
                                                    padding: '8px 10px',
                                                    borderRadius: 8,
                                                    border: '1px solid #e2e8f0',
                                                }}
                                            >
                                                {/* Product ID / Selector */}
                                                {availableProducts.length > 0 ? (
                                                    <select
                                                        value={item.product_id}
                                                        onChange={(e) => {
                                                            const pId = Number(e.target.value);
                                                            const p = availableProducts.find(x => x.id === pId);
                                                            const updated = [...newInvoiceData.items];
                                                            updated[itIdx].product_id = pId;
                                                            if (p && (p.price != null || p.selling_price != null)) {
                                                                updated[itIdx].unit_price = Number(p.price || p.selling_price || 0);
                                                            }
                                                            updateItemsAndAutoSyncPayments(updated);
                                                        }}
                                                        style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                    >
                                                        {!availableProducts.some(p => p.id === item.product_id) && (
                                                            <option value={item.product_id}>Product #{item.product_id}</option>
                                                        )}
                                                        {availableProducts.map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                #{p.id} - {p.name} (₹{p.price || p.selling_price || 0})
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.product_id}
                                                        onChange={(e) => {
                                                            const updated = [...newInvoiceData.items];
                                                            updated[itIdx].product_id = Number(e.target.value);
                                                            updateItemsAndAutoSyncPayments(updated);
                                                        }}
                                                        placeholder="Product ID"
                                                        style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                    />
                                                )}

                                                {/* Quantity */}
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const updated = [...newInvoiceData.items];
                                                        updated[itIdx].quantity = Math.max(1, Number(e.target.value));
                                                        updateItemsAndAutoSyncPayments(updated);
                                                    }}
                                                    placeholder="Qty"
                                                    style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                />

                                                {/* Unit Price */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    value={item.unit_price}
                                                    onChange={(e) => {
                                                        const updated = [...newInvoiceData.items];
                                                        updated[itIdx].unit_price = Math.max(0, Number(e.target.value));
                                                        updateItemsAndAutoSyncPayments(updated);
                                                    }}
                                                    placeholder="Unit Price"
                                                    style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                />

                                                {/* Discount */}
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.discount}
                                                    onChange={(e) => {
                                                        const updated = [...newInvoiceData.items];
                                                        updated[itIdx].discount = Math.max(0, Number(e.target.value));
                                                        updateItemsAndAutoSyncPayments(updated);
                                                    }}
                                                    placeholder="Disc"
                                                    style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                                />

                                                {/* Line Total */}
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                                                    ₹{lineTotal.toFixed(2)}
                                                </div>

                                                {/* Delete Item */}
                                                <div>
                                                    {newInvoiceData.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const updated = newInvoiceData.items.filter((_, i) => i !== itIdx);
                                                                updateItemsAndAutoSyncPayments(updated);
                                                            }}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                                        >
                                                            <BsTrash size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 3: Split Payments Management */}
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                                    <div>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <BsCreditCard size={14} color="#4f46e5" />
                                            Payment Splits ({newInvoiceData.payments.length} / max 5)
                                        </span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>
                                            Supports multiple modes: cash, upi, card, wallet, qr
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            type="button"
                                            id="auto-match-total-btn"
                                            onClick={() => {
                                                const grandTotal = Math.round(createTotals.grandTotal * 100) / 100;
                                                const updated = [...newInvoiceData.payments];
                                                if (updated.length > 0) {
                                                    updated[0].amount = grandTotal;
                                                    if (updated[0].payment_mode === 'cash') {
                                                        updated[0].amount_tendered = Math.ceil(grandTotal);
                                                        updated[0].change_due = Math.max(0, Math.ceil(grandTotal) - grandTotal);
                                                    }
                                                }
                                                setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                showAlert(`Payment amount matched to grand total: ₹${grandTotal.toFixed(2)}`, 'info');
                                            }}
                                            style={{
                                                background: '#ecfdf5',
                                                border: '1px solid #a7f3d0',
                                                borderRadius: 6,
                                                padding: '4px 10px',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: '#059669',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Auto-Match Total
                                        </button>
                                        {newInvoiceData.payments.length < 5 && (
                                            <button
                                                type="button"
                                                id="add-payment-split-btn"
                                                onClick={() => {
                                                    setNewInvoiceData({
                                                        ...newInvoiceData,
                                                        payments: [
                                                            ...newInvoiceData.payments,
                                                            { payment_mode: 'upi', amount: 0, transaction_reference: '', amount_tendered: null, change_due: null },
                                                        ],
                                                    });
                                                }}
                                                style={{
                                                    background: '#fff',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: 6,
                                                    padding: '4px 10px',
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    color: '#4f46e5',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                + Add Payment Split
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '120px 100px 1.2fr 90px 90px 32px', gap: 8, padding: '4px 8px', fontSize: 11, fontWeight: 600, color: '#64748b' }}>
                                    <span>Mode *</span>
                                    <span>Amount (₹) *</span>
                                    <span>Transaction Ref</span>
                                    <span>Tendered (₹)</span>
                                    <span>Change (₹)</span>
                                    <span></span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {newInvoiceData.payments.map((pay, pIdx) => (
                                        <div
                                            key={pIdx}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '120px 100px 1.2fr 90px 90px 32px',
                                                gap: 8,
                                                alignItems: 'center',
                                                background: '#fff',
                                                padding: '8px 10px',
                                                borderRadius: 8,
                                                border: '1px solid #e2e8f0',
                                            }}
                                        >
                                            <select
                                                value={pay.payment_mode}
                                                onChange={(e) => {
                                                    const updated = [...newInvoiceData.payments];
                                                    updated[pIdx].payment_mode = e.target.value;
                                                    setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                }}
                                                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                            >
                                                <option value="cash">Cash</option>
                                                <option value="upi">UPI</option>
                                                <option value="card">Card</option>
                                                <option value="credit_card">Credit Card</option>
                                                <option value="debit_card">Debit Card</option>
                                                <option value="wallet">Wallet</option>
                                                <option value="qr">QR Code</option>
                                            </select>

                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                required
                                                value={pay.amount}
                                                onChange={(e) => {
                                                    const updated = [...newInvoiceData.payments];
                                                    updated[pIdx].amount = Number(e.target.value);
                                                    setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                }}
                                                placeholder="Amount"
                                                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                            />

                                            <input
                                                type="text"
                                                value={pay.transaction_reference || ''}
                                                onChange={(e) => {
                                                    const updated = [...newInvoiceData.payments];
                                                    updated[pIdx].transaction_reference = e.target.value;
                                                    setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                }}
                                                placeholder="Ref / UPI ID / Card Ref"
                                                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                            />

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={pay.amount_tendered ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                                    const updated = [...newInvoiceData.payments];
                                                    updated[pIdx].amount_tendered = val;
                                                    if (val !== null) {
                                                        updated[pIdx].change_due = Math.max(0, val - Number(updated[pIdx].amount || 0));
                                                    }
                                                    setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                }}
                                                placeholder="Tendered"
                                                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                            />

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={pay.change_due ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                                    const updated = [...newInvoiceData.payments];
                                                    updated[pIdx].change_due = val;
                                                    setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                }}
                                                placeholder="Change"
                                                style={{ fontSize: 12, padding: '6px 8px', borderRadius: 4, border: '1px solid #cbd5e1' }}
                                            />

                                            <div>
                                                {newInvoiceData.payments.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const updated = newInvoiceData.payments.filter((_, i) => i !== pIdx);
                                                            setNewInvoiceData({ ...newInvoiceData, payments: updated });
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <BsTrash size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 4: Live Calculated Summary */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                    gap: 10,
                                    background: '#f8fafc',
                                    padding: '12px 16px',
                                    borderRadius: 10,
                                    border: '1px solid #e2e8f0',
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Items Subtotal</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13 }}>₹{createTotals.itemsSubtotal.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Discount</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13, color: '#ef4444' }}>-₹{createTotals.totalDiscount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Taxable Amount</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13, color: '#0ea5e9' }}>₹{createTotals.taxableAmount.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        {newInvoiceData.same_state ? 'CGST + SGST (18%)' : 'IGST (18%)'}
                                    </span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13, color: '#8b5cf6' }}>₹{createTotals.totalTax.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Estimated Grand Total</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 15, color: '#4f46e5' }}>₹{createTotals.grandTotal.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>Payments Tendered</span>
                                    <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: 13, color: Math.abs(createTotals.paymentDifference) < 0.05 ? '#10b981' : '#f59e0b' }}>
                                        ₹{createTotals.totalPayments.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Section 5: Live API Request Payload JSON Preview */}
                            <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 16px', color: '#f8fafc' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                                        Live Backend Request Payload (POST /api/v1/invoices)
                                    </span>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>
                                        Exact JSON payload transmitted to backend
                                    </span>
                                </div>
                                <pre style={{ margin: 0, fontSize: 11, fontFamily: 'monospace', color: '#93c5fd', maxHeight: 130, overflowY: 'auto', background: '#1e293b', padding: 10, borderRadius: 6 }}>
                                    {JSON.stringify({
                                        store_id: Number(newInvoiceData.store_id) || 1,
                                        customer_id: newInvoiceData.customer_id !== null && newInvoiceData.customer_id !== '' ? Number(newInvoiceData.customer_id) : null,
                                        same_state: Boolean(newInvoiceData.same_state),
                                        items: newInvoiceData.items.map(it => ({
                                            product_id: Number(it.product_id) || 1,
                                            quantity: Number(it.quantity) || 1,
                                            unit_price: Number(it.unit_price) || 0,
                                            discount: Number(it.discount) || 0,
                                        })),
                                        payments: newInvoiceData.payments.map(p => ({
                                            payment_mode: p.payment_mode,
                                            amount: Number(p.amount) || 0,
                                            transaction_reference: p.transaction_reference ? String(p.transaction_reference).trim() : null,
                                            amount_tendered: p.amount_tendered !== null && p.amount_tendered !== '' ? Number(p.amount_tendered) : null,
                                            change_due: p.change_due !== null && p.change_due !== '' ? Number(p.change_due) : null,
                                        })),
                                    }, null, 2)}
                                </pre>
                            </div>

                            {/* Modal Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="adm-btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="submit-create-invoice-btn"
                                    type="submit"
                                    disabled={createLoading}
                                    className="adm-btn-primary"
                                    style={{
                                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                        padding: '10px 24px',
                                        fontSize: 13,
                                    }}
                                >
                                    {createLoading ? 'Generating Invoice…' : 'Generate & Issue Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* =================================================================
               MODAL 2: INVOICE DETAILS & PREVIEW (GET /api/v1/invoices/{id})
               ================================================================= */}
            {showDetailModal && selectedInvoice && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowDetailModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 780,
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 22px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#eef2ff', color: '#4f46e5', padding: 8, borderRadius: 8 }}>
                                    <BsFileEarmarkText size={20} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a' }}>
                                        Invoice #{selectedInvoice.invoice_number || selectedInvoice.id}
                                    </h2>
                                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                                        Order #{selectedInvoice.order_id || selectedInvoice.id} &nbsp;·&nbsp; Store #{selectedInvoice.store_id || 1}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {getStatusBadge(selectedInvoice.status)}
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                >
                                    <BsX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Tabs (Details vs Live PDF Preview) */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', padding: '0 20px' }}>
                            <button
                                onClick={() => setActiveDetailTab('details')}
                                style={{
                                    padding: '10px 16px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeDetailTab === 'details' ? '2px solid #4f46e5' : '2px solid transparent',
                                    fontWeight: activeDetailTab === 'details' ? 700 : 500,
                                    color: activeDetailTab === 'details' ? '#4f46e5' : '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                }}
                            >
                                Breakdown &amp; Details
                            </button>
                            <button
                                onClick={() => setActiveDetailTab('pdf')}
                                style={{
                                    padding: '10px 16px',
                                    border: 'none',
                                    background: 'none',
                                    borderBottom: activeDetailTab === 'pdf' ? '2px solid #4f46e5' : '2px solid transparent',
                                    fontWeight: activeDetailTab === 'pdf' ? 700 : 500,
                                    color: activeDetailTab === 'pdf' ? '#4f46e5' : '#64748b',
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <BsFileEarmarkPdf size={13} /> PDF Live Preview
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {activeDetailTab === 'details' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* Financial Breakdown Grid */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                            gap: 10,
                                            background: '#f8fafc',
                                            padding: 14,
                                            borderRadius: 12,
                                            border: '1px solid #e2e8f0',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Taxable Subtotal</span>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{fmt(selectedInvoice.subtotal)}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Discount</span>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#ef4444' }}>-{fmt(selectedInvoice.discount_amount)}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>CGST</span>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#10b981' }}>{fmt(selectedInvoice.cgst_amount)}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>SGST</span>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#10b981' }}>{fmt(selectedInvoice.sgst_amount)}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>IGST</span>
                                            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>{fmt(selectedInvoice.igst_amount)}</p>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: '#94a3b8' }}>Grand Total</span>
                                            <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#4f46e5' }}>{fmt(selectedInvoice.total_amount)}</p>
                                        </div>
                                    </div>

                                    {/* Metadata Details */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                                        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Customer Info</span>
                                            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{selectedInvoice.customer_name || 'Walk-in Customer'}</p>
                                            {selectedInvoice.customer_phone && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Phone: {selectedInvoice.customer_phone}</p>}
                                        </div>
                                        <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                            <span style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>Billing Date &amp; Timestamp</span>
                                            <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{formatDate(selectedInvoice.created_at)}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>Invoice ID: #{selectedInvoice.id}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons inside Details */}
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid #e2e8f0' }}>
                                        <button
                                            onClick={() => openPdfPreviewModal(selectedInvoice, 'invoice')}
                                            className="adm-btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: '#2563eb' }}
                                        >
                                            <BsPrinter size={13} /> Preview &amp; Print
                                        </button>
                                        <button
                                            onClick={() => handleDownload(selectedInvoice.id, 'invoice', selectedInvoice.invoice_number)}
                                            className="adm-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: '#ecfdf5', color: '#059669', borderColor: '#10b981' }}
                                        >
                                            <BsDownload size={13} /> Download Tax Invoice (PDF)
                                        </button>
                                        <button
                                            onClick={() => handleDownload(selectedInvoice.id, 'bill', selectedInvoice.invoice_number)}
                                            className="adm-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                        >
                                            <BsReceiptCutoff size={13} /> Download POS Bill
                                        </button>
                                        <button
                                            onClick={() => openThermalModal(selectedInvoice)}
                                            className="adm-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#d97706', borderColor: '#fcd34d' }}
                                        >
                                            <BsSliders size={13} /> Thermal Receipt (80mm)
                                        </button>
                                        <button
                                            onClick={() => handleGenerateAsync(selectedInvoice.id)}
                                            className="adm-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                                        >
                                            <BsLightningChargeFill size={12} /> Generate Async
                                        </button>
                                        {selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'void' && (
                                            <button
                                                onClick={() => openVoidModal(selectedInvoice)}
                                                className="adm-btn-secondary"
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626', borderColor: '#fca5a5' }}
                                            >
                                                <BsTrash size={12} /> Void Invoice
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Live PDF Preview Tab */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => { setPdfDocType('invoice'); loadPdfPreview(selectedInvoice.id, 'invoice'); }}
                                                className={pdfDocType === 'invoice' ? 'adm-btn-primary' : 'adm-btn-secondary'}
                                                style={{ fontSize: 12, padding: '4px 10px' }}
                                            >
                                                Tax Invoice Format
                                            </button>
                                            <button
                                                onClick={() => { setPdfDocType('bill'); loadPdfPreview(selectedInvoice.id, 'bill'); }}
                                                className={pdfDocType === 'bill' ? 'adm-btn-primary' : 'adm-btn-secondary'}
                                                style={{ fontSize: 12, padding: '4px 10px' }}
                                            >
                                                POS Bill Format
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => handleDownload(selectedInvoice.id, pdfDocType)}
                                            className="adm-btn-secondary"
                                            style={{ fontSize: 12, padding: '4px 10px' }}
                                        >
                                            <BsDownload size={12} /> Save to Disk
                                        </button>
                                    </div>

                                    {pdfLoading ? (
                                        <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                                            <BsArrowRepeat size={20} className="spin" color="#4f46e5" style={{ marginBottom: 8 }} />
                                            <div>Generating PDF document preview…</div>
                                        </div>
                                    ) : pdfPreviewUrl ? (
                                        <iframe
                                            src={pdfPreviewUrl}
                                            title="Invoice PDF Preview"
                                            style={{ width: '100%', height: 440, border: '1px solid #cbd5e1', borderRadius: 8 }}
                                        />
                                    ) : (
                                        <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                            PDF document preview not available for this invoice.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}



            {/* =================================================================
               MODAL: VOID / CANCEL INVOICE (POST /api/v1/invoices/{id}/void)
               ================================================================= */}
            {showVoidModal && voidTargetInvoice && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowVoidModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        zIndex: 2200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 460,
                            padding: 24,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ background: '#fee2e2', color: '#dc2626', padding: 10, borderRadius: 10 }}>
                                <BsExclamationTriangleFill size={22} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                    Void / Cancel Tax Invoice
                                </h3>
                                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                                    Invoice #{voidTargetInvoice.invoice_number || voidTargetInvoice.id}
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: '#475569', marginBottom: 14, lineHeight: 1.5 }}>
                            Voiding this invoice will cancel active payments, restore inventory items to stock, and record an audit cancellation in compliance with GST guidelines.
                        </p>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                Cancellation Reason <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                rows={3}
                                required
                                value={voidReason}
                                onChange={(e) => setVoidReason(e.target.value)}
                                placeholder="Enter reason for voiding this invoice..."
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowVoidModal(false)}
                                style={{
                                    padding: '9px 18px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    background: '#f8fafc',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: '#475569',
                                }}
                            >
                                Dismiss
                            </button>
                            <button
                                type="button"
                                onClick={handleVoidSubmit}
                                disabled={voidLoading || !voidReason.trim()}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#dc2626',
                                    color: '#fff',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                {voidLoading && <BsArrowRepeat size={13} className="spin" />}
                                Confirm Void & Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================
               MODAL 4: ASYNC GENERATION TASK DIALOG
               ================================================================= */}
            {asyncTaskInfo && (
                <div
                    className="modal-backdrop"
                    onClick={() => setAsyncTaskInfo(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        zIndex: 2200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 440,
                            padding: 22,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ background: '#eff6ff', color: '#2563eb', padding: 8, borderRadius: 8 }}>
                                <BsLightningChargeFill size={20} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
                                    Async Generation Queued
                                </h3>
                                <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                                    POST /api/v1/invoices/{asyncTaskInfo.invoice_id}/generate-async
                                </p>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: '#64748b' }}>Status:</span>
                                <span style={{ fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>{asyncTaskInfo.status}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ color: '#64748b' }}>Task ID:</span>
                                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{asyncTaskInfo.task_id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: '#64748b' }}>Invoice Number:</span>
                                <span style={{ fontWeight: 600, color: '#4f46e5' }}>{asyncTaskInfo.invoice_number}</span>
                            </div>
                        </div>

                        <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
                            The PDF generation task has been dispatched to Celery background worker queue. You can download or preview the document once processing completes.
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setAsyncTaskInfo(null)}
                                className="adm-btn-primary"
                                style={{ background: '#2563eb' }}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================
               MODAL 5: DEDICATED INVOICE PREVIEW & PRINT MODAL (Requirement 2)
               ================================================================= */}
            {showPdfPreviewModal && pdfPreviewInvoice && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowPdfPreviewModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.75)',
                        zIndex: 2300,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 920,
                            height: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.3)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '14px 22px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                flexWrap: 'wrap',
                                gap: 10,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ background: '#eff6ff', color: '#2563eb', padding: 9, borderRadius: 10 }}>
                                    <BsFileEarmarkPdf size={22} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                            Invoice #{pdfPreviewInvoice.invoice_number || pdfPreviewInvoice.id}
                                        </h2>
                                        {getStatusBadge(pdfPreviewInvoice.status)}
                                    </div>
                                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                                        Order #{pdfPreviewInvoice.order_id || pdfPreviewInvoice.id} &nbsp;·&nbsp; Total: {fmt(pdfPreviewInvoice.total_amount)}
                                    </p>
                                </div>
                            </div>

                            {/* Top Action Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {/* Document Type Toggle (Invoice vs Bill) */}
                                <div style={{ display: 'flex', background: '#e2e8f0', padding: 3, borderRadius: 8 }}>
                                    <button
                                        id="preview-tab-tax-invoice-btn"
                                        onClick={() => {
                                            setPdfDocType('invoice');
                                            loadPdfWithStatusCheck(pdfPreviewInvoice.id, 'invoice', pdfPreviewInvoice.invoice_number);
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            border: 'none',
                                            borderRadius: 6,
                                            background: pdfDocType === 'invoice' ? '#fff' : 'transparent',
                                            color: pdfDocType === 'invoice' ? '#0f172a' : '#64748b',
                                            fontWeight: pdfDocType === 'invoice' ? 700 : 500,
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            boxShadow: pdfDocType === 'invoice' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        }}
                                    >
                                        Tax Invoice
                                    </button>
                                    <button
                                        id="preview-tab-pos-bill-btn"
                                        onClick={() => {
                                            setPdfDocType('bill');
                                            loadPdfWithStatusCheck(pdfPreviewInvoice.id, 'bill', pdfPreviewInvoice.invoice_number);
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            border: 'none',
                                            borderRadius: 6,
                                            background: pdfDocType === 'bill' ? '#fff' : 'transparent',
                                            color: pdfDocType === 'bill' ? '#0f172a' : '#64748b',
                                            fontWeight: pdfDocType === 'bill' ? 700 : 500,
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            boxShadow: pdfDocType === 'bill' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        }}
                                    >
                                        POS Bill
                                    </button>
                                </div>

                                {/* Print Invoice Button (Reliable Print Workflow) */}
                                <button
                                    id="preview-modal-print-btn"
                                    onClick={handlePrintPdf}
                                    disabled={pdfPreviewLoading || !pdfPreviewUrl}
                                    className="adm-btn-primary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        padding: '6px 14px',
                                        background: '#2563eb',
                                    }}
                                    title="Open Print Dialog"
                                >
                                    <BsPrinter size={13} /> Print Invoice
                                </button>

                                {/* Download PDF Button */}
                                <button
                                    id="preview-modal-download-btn"
                                    onClick={() => handleDownload(pdfPreviewInvoice.id, pdfDocType, pdfPreviewInvoice.invoice_number)}
                                    disabled={pdfPreviewLoading || !pdfPreviewUrl}
                                    className="adm-btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        padding: '6px 14px',
                                        background: '#ecfdf5',
                                        color: '#059669',
                                        borderColor: '#10b981',
                                    }}
                                >
                                    <BsDownload size={13} /> Download PDF
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowPdfPreviewModal(false)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        padding: 4,
                                        marginLeft: 4,
                                    }}
                                    title="Close Preview"
                                >
                                    <BsX size={26} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body: Actual PDF Rendering */}
                        <div style={{ flex: 1, position: 'relative', background: '#525659', display: 'flex', flexDirection: 'column' }}>
                            {pdfPreviewLoading ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 12, padding: 32 }}>
                                    <BsArrowRepeat size={36} className="spin" color="#38bdf8" />
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>Loading Invoice PDF…</div>
                                    {pdfStatusPolling && (
                                        <div style={{ fontSize: 13, color: '#bae6fd', maxWidth: 400, textAlign: 'center' }}>
                                            {pdfStatusMessage || 'Checking PDF status (GET /invoices/{id}/pdf-status)…'}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                        GET /api/v1/invoices/{pdfPreviewInvoice.id}/pdf?document_type={pdfDocType}
                                    </div>
                                </div>
                            ) : pdfPreviewUrl ? (
                                <iframe
                                    ref={previewIframeRef}
                                    src={pdfPreviewUrl}
                                    title={`Invoice-${pdfPreviewInvoice.invoice_number || pdfPreviewInvoice.id}-PDF`}
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 12, padding: 32 }}>
                                    <BsExclamationTriangleFill size={36} color="#f59e0b" />
                                    <div style={{ fontSize: 15, fontWeight: 600 }}>PDF Document Preview Not Available</div>
                                    <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>
                                        The document may still be compiling in background.
                                    </p>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                        <button
                                            onClick={() => loadPdfWithStatusCheck(pdfPreviewInvoice.id, pdfDocType, pdfPreviewInvoice.invoice_number)}
                                            className="adm-btn-primary"
                                            style={{ fontSize: 12 }}
                                        >
                                            <BsArrowRepeat size={13} /> Retry PDF Load
                                        </button>
                                        <button
                                            onClick={() => handleGenerateAsync(pdfPreviewInvoice.id)}
                                            className="adm-btn-secondary"
                                            style={{ fontSize: 12, background: '#fff' }}
                                        >
                                            <BsLightningChargeFill size={12} /> Trigger Async Generation
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div
                            style={{
                                padding: '10px 22px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                fontSize: 12,
                                color: '#64748b',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span>Official GST Compliant Invoice PDF</span>
                                <span>·</span>
                                <button
                                    onClick={() => {
                                        setShowPdfPreviewModal(false);
                                        openThermalModal(pdfPreviewInvoice);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#d97706',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: 0,
                                        fontSize: 12,
                                    }}
                                >
                                    <BsReceiptCutoff size={12} /> Switch to 80mm Thermal Receipt
                                </button>
                            </div>
                            <button
                                onClick={() => setShowPdfPreviewModal(false)}
                                className="adm-btn-secondary"
                                style={{ fontSize: 12, padding: '5px 14px' }}
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================
               MODAL 6: DOWNLOAD INVOICE MODAL (Requirement 3)
               ================================================================= */}
            {showDownloadModal && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowDownloadModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.65)',
                        zIndex: 2250,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 560,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 22px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#ecfdf5', color: '#059669', padding: 9, borderRadius: 10 }}>
                                    <BsDownload size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                        Download Tax Invoice
                                    </h3>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                                        Lookup invoice by number or select from recent records
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDownloadModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '20px 22px' }}>
                            {/* Search by Number (GET /invoices/by-number/{invoice_number}) */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                                    Lookup Invoice by Number (GET /invoices/by-number)
                                </label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={downloadSearchNumber}
                                        onChange={(e) => setDownloadSearchNumber(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleDownloadModalLookup(); }}
                                        placeholder="e.g. INV-2026-000001 or scan barcode"
                                        style={{
                                            flex: 1,
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #cbd5e1',
                                            fontSize: 13,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleDownloadModalLookup}
                                        disabled={downloadLookupLoading || !downloadSearchNumber.trim()}
                                        className="adm-btn-primary"
                                        style={{ fontSize: 13, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        {downloadLookupLoading ? <BsArrowRepeat size={14} className="spin" /> : <BsSearch size={13} />}
                                        Lookup
                                    </button>
                                </div>
                                {downloadLookupError && (
                                    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#ef4444' }}>
                                        {downloadLookupError}
                                    </p>
                                )}
                            </div>

                            {/* Found Invoice Card */}
                            {downloadLookupResult ? (
                                <div
                                    style={{
                                        background: '#f8fafc',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: 12,
                                        padding: 16,
                                        marginBottom: 16,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <span style={{ fontWeight: 700, color: '#4f46e5', fontSize: 15 }}>
                                            #{downloadLookupResult.invoice_number}
                                        </span>
                                        {getStatusBadge(downloadLookupResult.status)}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12, color: '#475569', marginBottom: 14 }}>
                                        <div>Date: <b>{formatDate(downloadLookupResult.created_at)}</b></div>
                                        <div>Total: <b style={{ color: '#0f172a' }}>{fmt(downloadLookupResult.total_amount)}</b></div>
                                        <div>Order ID: #{downloadLookupResult.order_id || '—'}</div>
                                        <div>Store ID: #{downloadLookupResult.store_id || 1}</div>
                                    </div>

                                    {/* Format Selection */}
                                    <div style={{ marginBottom: 12 }}>
                                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                            Choose Document Format:
                                        </label>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="modal_doc_type"
                                                    checked={downloadDocType === 'invoice'}
                                                    onChange={() => setDownloadDocType('invoice')}
                                                />
                                                Tax Invoice (A4 Standard)
                                            </label>
                                            <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="modal_doc_type"
                                                    checked={downloadDocType === 'bill'}
                                                    onChange={() => setDownloadDocType('bill')}
                                                />
                                                POS Bill (Compact Receipt)
                                            </label>
                                        </div>
                                    </div>

                                    {/* Action Buttons for Lookup Result */}
                                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                handleDownload(downloadLookupResult.id, downloadDocType, downloadLookupResult.invoice_number);
                                                setShowDownloadModal(false);
                                            }}
                                            className="adm-btn-primary"
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
                                        >
                                            <BsDownload size={14} /> Download {downloadDocType === 'bill' ? 'Bill' : 'Invoice'} PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDownloadModal(false);
                                                openPdfPreviewModal(downloadLookupResult, downloadDocType);
                                            }}
                                            className="adm-btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
                                        >
                                            <BsPrinter size={14} /> Preview &amp; Print
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Or Select from Loaded Invoices */
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                        <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>OR CHOOSE FROM LOADED LIST</span>
                                        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                    </div>

                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                                        Select from loaded invoices
                                    </label>
                                    <select
                                        value={selectedTableInvoiceId || ''}
                                        onChange={(e) => setSelectedTableInvoiceId(e.target.value ? Number(e.target.value) : null)}
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #cbd5e1',
                                            fontSize: 13,
                                            marginBottom: 16,
                                        }}
                                    >
                                        <option value="">-- Choose an invoice ({invoices.length} loaded) --</option>
                                        {invoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                #{inv.invoice_number || inv.id} — {fmt(inv.total_amount)} ({inv.customer_name || 'Walk-in'})
                                            </option>
                                        ))}
                                    </select>

                                    {selectedTableInvoice && (
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleDownload(selectedTableInvoice.id, 'invoice', selectedTableInvoice.invoice_number);
                                                    setShowDownloadModal(false);
                                                }}
                                                className="adm-btn-primary"
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
                                            >
                                                <BsDownload size={14} /> Download Selected PDF
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowDownloadModal(false);
                                                    openPdfPreviewModal(selectedTableInvoice, 'invoice');
                                                }}
                                                className="adm-btn-secondary"
                                                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '9px 14px' }}
                                            >
                                                <BsPrinter size={14} /> Preview &amp; Print
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div
                            style={{
                                padding: '12px 22px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                background: '#f8fafc',
                            }}
                        >
                            <button
                                onClick={() => setShowDownloadModal(false)}
                                className="adm-btn-secondary"
                                style={{ fontSize: 13, padding: '6px 16px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =================================================================
               MODAL 7: THERMAL RECEIPT SLIP & REPRINT MODAL (Requirement 7)
               ================================================================= */}
            {showThermalModal && thermalInvoice && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowThermalModal(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.7)',
                        zIndex: 2350,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        backdropFilter: 'blur(3px)',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#fff',
                            borderRadius: 16,
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: '94vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ background: '#fffbeb', color: '#d97706', padding: 9, borderRadius: 10 }}>
                                    <BsReceiptCutoff size={20} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                                            Thermal Receipt (80mm ESC/POS)
                                        </h3>
                                        {isReprintMode && (
                                            <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                                                DUPLICATE / REPRINT
                                            </span>
                                        )}
                                    </div>
                                    <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                                        Invoice #{thermalInvoice.invoice_number || thermalInvoice.id} · GET /invoices/{thermalInvoice.id}/thermal
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowThermalModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                            >
                                <BsX size={24} />
                            </button>
                        </div>

                        {/* Controls Bar */}
                        <div
                            style={{
                                padding: '10px 20px',
                                background: '#f1f5f9',
                                borderBottom: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10,
                                flexWrap: 'wrap',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                <span style={{ fontWeight: 600, color: '#475569' }}>Printer:</span>
                                <select
                                    value={thermalPrinterType}
                                    onChange={(e) => handleThermalPrinterChange(e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 12 }}
                                >
                                    <option value="generic">Generic (Standard 80mm)</option>
                                    <option value="epson">Epson TM-T88 (ESC/POS)</option>
                                    <option value="tvs">TVS RP Series</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleReprintReceipt}
                                    disabled={reprintSubmitting}
                                    className="adm-btn-primary"
                                    style={{
                                        fontSize: 12,
                                        padding: '5px 12px',
                                        background: '#d97706',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                    }}
                                    title="Reprint with *** DUPLICATE / REPRINT *** header"
                                >
                                    {reprintSubmitting ? <BsArrowRepeat size={12} className="spin" /> : <BsPrinter size={12} />}
                                    Reprint Thermal Slip
                                </button>
                            </div>
                        </div>

                        {/* Receipt Preview Canvas */}
                        <div
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: 20,
                                background: '#e2e8f0',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'flex-start',
                            }}
                        >
                            {thermalLoading ? (
                                <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                                    <BsArrowRepeat size={28} className="spin" color="#d97706" style={{ marginBottom: 8 }} />
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Rendering 80mm thermal receipt preview…</div>
                                </div>
                            ) : thermalPreviewUrl ? (
                                <div style={{ background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxWidth: 380 }}>
                                    <img
                                        src={thermalPreviewUrl}
                                        alt="Thermal Receipt Preview (80mm)"
                                        style={{ width: '100%', display: 'block', borderRadius: 4 }}
                                    />
                                </div>
                            ) : (
                                <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>
                                    Thermal receipt preview could not be generated.
                                </div>
                            )}
                        </div>

                        {/* Export Actions Footer */}
                        <div
                            style={{
                                padding: '12px 20px',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                flexWrap: 'wrap',
                                gap: 8,
                            }}
                        >
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleDownloadThermalEscPos}
                                    className="adm-btn-secondary"
                                    style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                                    title="Download raw ESC/POS text stream"
                                >
                                    <BsDownload size={12} /> Download ESC/POS (.txt)
                                </button>
                                <button
                                    onClick={handleDownloadThermalPdf}
                                    className="adm-btn-secondary"
                                    style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                                    title="Download 80mm receipt PDF"
                                >
                                    <BsFileEarmarkPdf size={12} /> Download Thermal PDF
                                </button>
                            </div>
                            <button
                                onClick={() => setShowThermalModal(false)}
                                className="adm-btn-secondary"
                                style={{ fontSize: 12, padding: '5px 12px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingManagement;
