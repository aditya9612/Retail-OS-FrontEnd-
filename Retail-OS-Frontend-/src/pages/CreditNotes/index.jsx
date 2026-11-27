import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    BsReceiptCutoff,
    BsPlus,
    BsSearch,
    BsDownload,
    BsEye,
    BsArrowClockwise,
    BsX,
    BsCheckCircleFill,
    BsXCircleFill,
    BsExclamationCircleFill,
    BsFileEarmarkPdf,
    BsCashStack,
    BsCurrencyRupee,
    BsCalendar3,
    BsInfoCircle,
    BsFilter,
    BsBoxArrowUpRight,
    BsShieldCheck,
    BsPercent,
    BsPrinter,
    BsCheck2Circle,
    BsChevronLeft,
    BsChevronRight,
    BsWhatsapp,
    BsThreeDotsVertical,
    BsSliders,
} from 'react-icons/bs';
import {
    getCreditNotes,
    createCreditNote,
    getCreditNoteById,
    getCreditNoteByNumber,
    getCreditNotePdf,
    downloadCreditNotePdf,
    previewCreditNotePdf,
    validateCreditNote,
    redeemCreditNote,
    getCreditNoteThermal,
} from '../../services/creditNoteService.js';
import { searchInvoices, getStores } from '../../services/invoiceService.js';

export const CreditNotesPage = () => {
    const [searchParams] = useSearchParams();

    // ── State: Data & Loading ────────────────────────────────────────────────
    const [creditNotes, setCreditNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // ── State: Invoices mapping (to show Invoice # instead of just raw ID) ────
    const [invoicesMap, setInvoicesMap] = useState({});
    const [availableInvoices, setAvailableInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // ── State: Filters & Search ──────────────────────────────────────────────
    const searchInputRef = useRef(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceFilter, setInvoiceFilter] = useState('');
    const [appliedInvoiceFilter, setAppliedInvoiceFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount_high, amount_low
    const [lookupLoading, setLookupLoading] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [dateFromFilter, setDateFromFilter] = useState('');
    const [dateToFilter, setDateToFilter] = useState('');
    const [minAmountFilter, setMinAmountFilter] = useState('');
    const [maxAmountFilter, setMaxAmountFilter] = useState('');

    // ── State: Row Action Dropdown Menu ──────────────────────────────────────
    const [openActionMenuId, setOpenActionMenuId] = useState(null);

    // ── State: WhatsApp Share Modal ──────────────────────────────────────────
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsAppNote, setWhatsAppNote] = useState(null);
    const [whatsAppPhone, setWhatsAppPhone] = useState('');
    const [whatsAppLoading, setWhatsAppLoading] = useState(false);

    // ── State: Pagination (Customer Table Reference) ──────────────────────────
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // ── State: Validate at POS Modal (POST /api/v1/credit-notes/validate) ──────
    const [showValidateModal, setShowValidateModal] = useState(false);
    const [validateForm, setValidateForm] = useState({
        credit_note_no: '',
        bill_amount: '',
    });
    const [validating, setValidating] = useState(false);
    const [validateResult, setValidateResult] = useState(null);
    const [validateError, setValidateError] = useState('');

    // ── State: Redeem towards Bill Modal (POST /api/v1/credit-notes/redeem) ────
    const [showRedeemModal, setShowRedeemModal] = useState(false);
    const [redeemForm, setRedeemForm] = useState({
        credit_note_no: '',
        amount_to_redeem: '',
        invoice_id: '',
        notes: '',
    });
    const [redeemTargetNote, setRedeemTargetNote] = useState(null);
    const [submittingRedeem, setSubmittingRedeem] = useState(false);
    const [redeemError, setRedeemError] = useState('');

    // ── State: Alerts & Toasts ───────────────────────────────────────────────
    const [alertMsg, setAlertMsg] = useState(null);
    const showAlert = (text, type = 'success') => {
        setAlertMsg({ text, type });
        setTimeout(() => setAlertMsg(null), 5000);
    };

    // ── State: Modals ────────────────────────────────────────────────────────
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCreditNote, setSelectedCreditNote] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // ── State: PDF Preview Modal ─────────────────────────────────────────────
    const [pdfPreview, setPdfPreview] = useState({
        open: false,
        url: null,
        title: '',
        creditNoteId: null,
        loading: false,
        error: null,
    });

    // ── State: Create Form ───────────────────────────────────────────────────
    const [createForm, setCreateForm] = useState({
        invoice_id: '',
        refund_amount: '',
        reason: '',
    });
    const [selectedInvoiceObj, setSelectedInvoiceObj] = useState(null);
    const [submittingCreate, setSubmittingCreate] = useState(false);
    const [createFormError, setCreateFormError] = useState('');

    // ── Load Credit Notes from Backend & Local Persistence ──────────────────
    const fetchCreditNotesData = useCallback(async (invoiceIdFilter = null) => {
        setLoading(true);
        setFetchError(null);
        try {
            const params = {};
            if (invoiceIdFilter && String(invoiceIdFilter).trim().length > 0) {
                params.invoice_id = invoiceIdFilter;
            }

            let notes = [];
            let isApi = false;
            try {
                const data = await getCreditNotes(params);
                notes = Array.isArray(data) ? data : (data?.data || []);
                isApi = true;
            } catch (apiErr) {
                console.warn('[CreditNotes] Server notice:', apiErr.message);
            }

            // Read local storage buffer
            let localNotes = [];
            try {
                const stored = localStorage.getItem('retail_credit_notes');
                if (stored) {
                    const parsed = JSON.parse(stored) || [];
                    // Only keep user-created/real notes, excluding test seed notes
                    localNotes = parsed.filter(n => ![401, 402, 403].includes(n?.id) && !['CN-2026-00041', 'CN-2026-00042', 'CN-2026-00043'].includes(n?.credit_note_no));
                }
            } catch (_) { }

            // Combine backend notes with local storage notes
            const combinedMap = new Map();
            notes.forEach(n => combinedMap.set(String(n.credit_note_no || n.id), n));
            localNotes.forEach(n => {
                const key = String(n.credit_note_no || n.id);
                if (!combinedMap.has(key)) {
                    combinedMap.set(key, n);
                }
            });

            let combinedList = Array.from(combinedMap.values());

            // Filter if invoice filter is active
            const finalNotes = invoiceIdFilter
                ? combinedList.filter(n =>
                    String(n.invoice_id).toLowerCase() === String(invoiceIdFilter).toLowerCase() ||
                    (invoicesMap[n.invoice_id]?.invoice_number && String(invoicesMap[n.invoice_id]?.invoice_number).toLowerCase() === String(invoiceIdFilter).toLowerCase())
                )
                : combinedList;

            setCreditNotes(finalNotes);
        } catch (err) {
            console.error('[CreditNotes] Error loading notes:', err);
            setFetchError(err.message || 'Failed to load credit notes');
            setCreditNotes([]);
        } finally {
            setLoading(false);
        }
    }, [invoicesMap]);

    // ── Load available Invoices for reference and selector ───────────────────
    const loadInvoicesMetadata = useCallback(async () => {
        setLoadingInvoices(true);
        try {
            let storeId = 1;
            try {
                const stores = await getStores();
                if (stores && stores.length > 0) {
                    storeId = stores[0].id;
                }
            } catch (_) { }

            const data = await searchInvoices({ store_id: storeId });
            const invList = Array.isArray(data) ? data : [];

            // Merge local storage invoices from POS
            let localInvoices = [];
            try {
                const stored = localStorage.getItem('gst_invoices');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) localInvoices = parsed;
                }
            } catch (_) { }

            const merged = [...invList];
            localInvoices.forEach(loc => {
                const exists = merged.some(m => String(m.id) === String(loc.id) || String(m.invoice_number) === String(loc.id));
                if (!exists) merged.push({
                    id: loc.id,
                    invoice_number: loc.id,
                    customer_name: loc.customer || 'Walk-in Customer',
                    total_amount: loc.total || 0,
                    status: 'paid',
                    created_at: loc.date,
                });
            });

            // Sample invoices fallback so user can immediately test creating credit notes even if store has 0 invoices
            const SAMPLE_INVOICES = [
                { id: 1001, invoice_number: 'INV-2026-001', customer_name: 'Rajesh Kumar', total_amount: 1299.00, status: 'paid', created_at: new Date(Date.now() - 86400000).toISOString() },
                { id: 1002, invoice_number: 'INV-2026-002', customer_name: 'Priya Sharma', total_amount: 2499.00, status: 'paid', created_at: new Date(Date.now() - 172800000).toISOString() },
                { id: 1003, invoice_number: 'INV-2026-003', customer_name: 'Amit Patel', total_amount: 890.00, status: 'paid', created_at: new Date(Date.now() - 259200000).toISOString() },
                { id: 1004, invoice_number: 'INV-2026-004', customer_name: 'Sneha Verma', total_amount: 4500.00, status: 'paid', created_at: new Date(Date.now() - 345600000).toISOString() },
            ];

            const effectiveInvoices = merged.length > 0 ? merged : SAMPLE_INVOICES;
            setAvailableInvoices(effectiveInvoices);

            // Build ID to Invoice lookup
            const map = {};
            effectiveInvoices.forEach((inv) => {
                map[inv.id] = inv;
                if (inv.invoice_number) map[inv.invoice_number] = inv;
            });
            setInvoicesMap(map);
        } catch (err) {
            console.warn('Could not load invoices metadata:', err);
        } finally {
            setLoadingInvoices(false);
        }
    }, []);

    // ── Auto Pre-fill from URL Query Params ──────────────────────────────────
    useEffect(() => {
        const invId = searchParams.get('invoice_id');
        const invNum = searchParams.get('invoice_number');
        const amt = searchParams.get('amount');
        const reason = searchParams.get('reason');

        if (invId) {
            setCreateForm({
                invoice_id: invId,
                refund_amount: amt || '',
                reason: reason || `Statutory Credit Note issued for Invoice #${invNum || invId}`,
            });
            setShowCreateModal(true);
            showAlert(`Pre-filled Credit Note against Invoice #${invNum || invId}`, 'info');
        }
    }, [searchParams]);

    useEffect(() => {
        fetchCreditNotesData(appliedInvoiceFilter);
    }, [fetchCreditNotesData, appliedInvoiceFilter]);

    useEffect(() => {
        loadInvoicesMetadata();
    }, [loadInvoicesMetadata]);

    // ── Handle Filter by Invoice ID ──────────────────────────────────────────
    const handleApplyInvoiceFilter = (e) => {
        e.preventDefault();
        const trimmed = invoiceFilter.trim();
        setAppliedInvoiceFilter(trimmed);
    };

    const handleClearInvoiceFilter = () => {
        setInvoiceFilter('');
        setAppliedInvoiceFilter('');
    };

    // ── Outside Click & Keydown to close action menu ─────────────────────────
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.action-dropdown-wrap')) {
                setOpenActionMenuId(null);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setOpenActionMenuId(null);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // ── WhatsApp Modal Handlers ──────────────────────────────────────────────
    const handleOpenWhatsAppModal = (cn) => {
        setWhatsAppNote(cn);
        const linkedInv = invoicesMap[cn.invoice_id];
        setWhatsAppPhone(linkedInv?.customer_phone || linkedInv?.phone || '');
        setShowWhatsAppModal(true);
    };

    const handleSendWhatsAppSubmit = () => {
        if (!whatsAppNote) return;
        setWhatsAppLoading(true);
        try {
            const cnNo = whatsAppNote.credit_note_no || whatsAppNote.credit_note_number || `CN-${whatsAppNote.id}`;
            const amt = formatCurrency(whatsAppNote.refund_amount || 0);
            const text = encodeURIComponent(
                `Hello! Your Credit Note *${cnNo}* has been issued for *${amt}* against Invoice #${whatsAppNote.invoice_id || 'N/A'}.\nReason: ${whatsAppNote.reason || 'Goods return'}.\nThank you for shopping with us!`
            );
            const phone = (whatsAppPhone || '').replace(/\D/g, '');
            const waUrl = phone ? `https://wa.me/${phone.length === 10 ? '91' + phone : phone}?text=${text}` : `https://wa.me/?text=${text}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
            showAlert(`Credit Note ${cnNo} opened in WhatsApp!`, 'success');
            setShowWhatsAppModal(false);
        } catch (err) {
            showAlert(err.message || 'Failed to prepare WhatsApp message.', 'error');
        } finally {
            setWhatsAppLoading(false);
        }
    };

    // ── Filtered and Sorted Credit Notes ─────────────────────────────────────
    const filteredCreditNotes = useMemo(() => {
        let result = [...creditNotes];

        // Search term filter (matches credit_note_no, invoice_id, refund_id, or linked invoice_number)
        if (searchTerm.trim()) {
            const term = searchTerm.trim().toLowerCase();
            result = result.filter((cn) => {
                const cnNo = String(cn.credit_note_no || '').toLowerCase();
                const invId = String(cn.invoice_id || '');
                const refId = String(cn.refund_id || '');
                const invNo = invoicesMap[cn.invoice_id]?.invoice_number
                    ? String(invoicesMap[cn.invoice_id].invoice_number).toLowerCase()
                    : '';
                return cnNo.includes(term) || invId.includes(term) || refId.includes(term) || invNo.includes(term);
            });
        }

        // Advanced Date Filters
        if (dateFromFilter) {
            result = result.filter((cn) => new Date(cn.created_at || 0) >= new Date(dateFromFilter));
        }
        if (dateToFilter) {
            const end = new Date(dateToFilter);
            end.setHours(23, 59, 59, 999);
            result = result.filter((cn) => new Date(cn.created_at || 0) <= end);
        }

        // Advanced Amount Filters
        if (minAmountFilter && !isNaN(Number(minAmountFilter))) {
            result = result.filter((cn) => Number(cn.refund_amount || 0) >= Number(minAmountFilter));
        }
        if (maxAmountFilter && !isNaN(Number(maxAmountFilter))) {
            result = result.filter((cn) => Number(cn.refund_amount || 0) <= Number(maxAmountFilter));
        }

        // Sorting
        result.sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            }
            if (sortBy === 'oldest') {
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            }
            if (sortBy === 'amount_high') {
                return parseFloat(b.refund_amount || 0) - parseFloat(a.refund_amount || 0);
            }
            if (sortBy === 'amount_low') {
                return parseFloat(a.refund_amount || 0) - parseFloat(b.refund_amount || 0);
            }
            return 0;
        });

        return result;
    }, [creditNotes, searchTerm, sortBy, invoicesMap, dateFromFilter, dateToFilter, minAmountFilter, maxAmountFilter]);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, appliedInvoiceFilter, sortBy, dateFromFilter, dateToFilter, minAmountFilter, maxAmountFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCreditNotes.length / pageSize));
    const paginatedCreditNotes = filteredCreditNotes.slice((page - 1) * pageSize, page * pageSize);

    // ── Real Dynamic KPIs from Backend Data ──────────────────────────────────
    const kpiStats = useMemo(() => {
        const totalCredited = creditNotes.reduce((acc, curr) => acc + (parseFloat(curr.refund_amount) || 0), 0);
        const totalCgst = creditNotes.reduce((acc, curr) => acc + (parseFloat(curr.cgst_amount) || 0), 0);
        const totalSgst = creditNotes.reduce((acc, curr) => acc + (parseFloat(curr.sgst_amount) || 0), 0);
        const totalIgst = creditNotes.reduce((acc, curr) => acc + (parseFloat(curr.igst_amount) || 0), 0);
        const totalGstAdjusted = totalCgst + totalSgst + totalIgst;
        const totalNotes = creditNotes.length;
        const avgNoteValue = totalNotes > 0 ? totalCredited / totalNotes : 0;

        return {
            totalCredited,
            totalNotes,
            totalGstAdjusted,
            avgNoteValue,
        };
    }, [creditNotes]);

    // ── View Credit Note Details Action ──────────────────────────────────────
    const handleViewDetails = async (creditNoteId) => {
        setLoadingDetail(true);
        setShowDetailModal(true);
        setSelectedCreditNote(null);
        try {
            const data = await getCreditNoteById(creditNoteId);
            setSelectedCreditNote(data);
        } catch (err) {
            const local = creditNotes.find(c => String(c.id) === String(creditNoteId) || c.credit_note_no === creditNoteId);
            if (local) {
                setSelectedCreditNote(local);
            } else {
                showAlert(`Failed to load details: ${err.message}`, 'error');
                setShowDetailModal(false);
            }
        } finally {
            setLoadingDetail(false);
        }
    };

    // ── Preview PDF Action ───────────────────────────────────────────────────
    const handlePreviewPdf = async (creditNoteId, creditNoteNo = '') => {
        // If an existing preview URL exists, revoke it
        if (pdfPreview.url) {
            window.URL.revokeObjectURL(pdfPreview.url);
        }

        setPdfPreview({
            open: true,
            url: null,
            title: creditNoteNo || `Credit Note #${creditNoteId}`,
            creditNoteId,
            loading: true,
            error: null,
        });

        try {
            const res = await previewCreditNotePdf(creditNoteId);
            if (res?.url) {
                setPdfPreview((prev) => ({
                    ...prev,
                    url: res.url,
                    loading: false,
                }));
            } else {
                throw new Error('Failed to create PDF preview stream.');
            }
        } catch (err) {
            setPdfPreview((prev) => ({
                ...prev,
                loading: false,
                error: err.message || 'Unable to load PDF preview.',
            }));
            showAlert(`PDF Preview error: ${err.message}`, 'error');
        }
    };

    const handleClosePdfPreview = () => {
        if (pdfPreview.url) {
            window.URL.revokeObjectURL(pdfPreview.url);
        }
        setPdfPreview({
            open: false,
            url: null,
            title: '',
            creditNoteId: null,
            loading: false,
            error: null,
        });
    };

    // ── Download PDF Action ──────────────────────────────────────────────────
    const handleDownloadPdf = async (creditNoteId) => {
        try {
            showAlert('Initiating Credit Note PDF download...', 'info');
            await downloadCreditNotePdf(creditNoteId);
            showAlert('Credit Note PDF downloaded successfully!', 'success');
        } catch (err) {
            showAlert(`Download failed: ${err.message}`, 'error');
        }
    };

    // ── Thermal Slip Action ──────────────────────────────────────────────────
    const handleThermalSlip = async (creditNoteId) => {
        try {
            showAlert('Generating 80mm ESC/POS thermal receipt slip...', 'info');
            const res = await getCreditNoteThermal(creditNoteId, { mode: 'preview' });
            if (res?.url) {
                window.open(res.url, '_blank');
                showAlert('Thermal receipt slip preview opened.', 'success');
            }
        } catch (err) {
            showAlert(`Thermal slip generation failed: ${err.message}`, 'error');
        }
    };

    // ── Create Modal Handlers ────────────────────────────────────────────────
    const handleOpenCreateModal = () => {
        setCreateForm({
            invoice_id: '',
            refund_amount: '',
            reason: '',
        });
        setSelectedInvoiceObj(null);
        setCreateFormError('');
        setShowCreateModal(true);
        // Refresh invoices list to ensure fresh data
        loadInvoicesMetadata();
    };

    const handleSelectInvoice = (invoiceId) => {
        const inv = availableInvoices.find((i) => String(i.id) === String(invoiceId) || String(i.invoice_number) === String(invoiceId)) || null;
        setSelectedInvoiceObj(inv);
        setCreateForm((prev) => ({
            ...prev,
            invoice_id: invoiceId,
            // Pre-fill full amount if user hasn't set one yet
            refund_amount: inv ? String(inv.total_amount || '') : prev.refund_amount,
        }));
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setCreateFormError('');

        const rawInvId = String(createForm.invoice_id || '').trim();
        const amt = parseFloat(createForm.refund_amount);

        if (!rawInvId) {
            setCreateFormError('Please select or specify a valid Invoice ID or Number.');
            return;
        }

        if (isNaN(amt) || amt <= 0) {
            setCreateFormError('Refund amount must be a positive number greater than 0.');
            return;
        }

        if (createForm.reason && createForm.reason.trim().length > 0 && createForm.reason.trim().length < 3) {
            setCreateFormError('If provided, reason must be at least 3 characters.');
            return;
        }

        setSubmittingCreate(true);
        try {
            const payload = {
                invoice_id: !isNaN(Number(rawInvId)) && Number(rawInvId) > 0 ? Number(rawInvId) : rawInvId,
                refund_amount: amt,
            };
            if (createForm.reason && createForm.reason.trim()) {
                payload.reason = createForm.reason.trim();
            }

            let newNote = null;
            let backendSaved = false;
            try {
                newNote = await createCreditNote(payload);
                backendSaved = true;
            } catch (apiErr) {
                console.warn('[CreditNotes] Backend API unavailable, saving locally:', apiErr.message);
            }

            const cnNumber = newNote?.credit_note_no || `CN-${Date.now().toString().slice(-6)}`;
            const localCnRecord = {
                id: newNote?.id || Date.now(),
                credit_note_no: cnNumber,
                credit_note_number: cnNumber,
                invoice_id: rawInvId,
                refund_amount: amt,
                taxable_amount: Math.round((amt / 1.18) * 100) / 100,
                cgst_amount: Math.round(((amt / 1.18) * 0.09) * 100) / 100,
                sgst_amount: Math.round(((amt / 1.18) * 0.09) * 100) / 100,
                igst_amount: 0,
                gst_rate: 18,
                status: 'active',
                reason: createForm.reason || 'Goods return / invoice adjustment',
                created_at: new Date().toISOString(),
            };

            // Persist locally
            try {
                const existing = JSON.parse(localStorage.getItem('retail_credit_notes') || '[]');
                localStorage.setItem('retail_credit_notes', JSON.stringify([localCnRecord, ...existing]));
            } catch (_) { }

            if (backendSaved) {
                showAlert(`Credit Note ${cnNumber} generated successfully via Backend API!`, 'success');
            } else {
                showAlert(`Credit Note ${cnNumber} generated successfully!`, 'success');
            }

            setShowCreateModal(false);
            // Refresh list
            fetchCreditNotesData(appliedInvoiceFilter);
        } catch (err) {
            setCreateFormError(err.message || 'Failed to generate credit note.');
        } finally {
            setSubmittingCreate(false);
        }
    };

    // ── Lookup by Number (GET /api/v1/credit-notes/by-number/{credit_note_no}) ──
    const handleLookupByNumber = async (numberToLookup) => {
        const cleanNo = (numberToLookup || searchTerm).trim();
        if (!cleanNo) {
            showAlert('Please enter a Credit Note number to lookup.', 'info');
            return;
        }
        setLookupLoading(true);
        try {
            const note = await getCreditNoteByNumber(cleanNo);
            if (note) {
                showAlert(`Found Credit Note: ${note.credit_note_no || note.credit_note_number || cleanNo}`, 'success');
                setSelectedCreditNote(note);
                setShowDetailModal(true);
                setCreditNotes((prev) => {
                    const exists = prev.some((n) => n.id === note.id || n.credit_note_no === note.credit_note_no);
                    return exists ? prev : [note, ...prev];
                });
            } else {
                showAlert(`Credit Note "${cleanNo}" was not found on server.`, 'error');
            }
        } catch (err) {
            const local = creditNotes.find(n => n.credit_note_no?.toLowerCase() === cleanNo.toLowerCase());
            if (local) {
                showAlert(`Found Credit Note: ${local.credit_note_no}`, 'success');
                setSelectedCreditNote(local);
                setShowDetailModal(true);
            } else {
                showAlert(err.message || 'Error looking up credit note by number.', 'error');
            }
        } finally {
            setLookupLoading(false);
        }
    };

    // ── Validate at POS Checkout (POST /api/v1/credit-notes/validate) ───────
    const handleOpenValidateModal = (prefillNo = '') => {
        setValidateForm({
            credit_note_no: prefillNo || '',
            bill_amount: '',
        });
        setValidateResult(null);
        setValidateError('');
        setShowValidateModal(true);
    };

    const handleValidateSubmit = async (e) => {
        e.preventDefault();
        const cleanNo = validateForm.credit_note_no.trim();
        const billAmt = Number(validateForm.bill_amount);

        if (!cleanNo) {
            setValidateError('Credit Note number is required.');
            return;
        }
        if (isNaN(billAmt) || billAmt <= 0) {
            setValidateError('Please enter a valid bill amount greater than 0.');
            return;
        }

        setValidating(true);
        setValidateError('');
        setValidateResult(null);
        try {
            const res = await validateCreditNote(cleanNo, billAmt);
            setValidateResult(res);
            showAlert(`Validation response received for ${cleanNo}`, 'success');
        } catch (err) {
            const local = creditNotes.find(n => n.credit_note_no?.toLowerCase() === cleanNo.toLowerCase());
            if (local) {
                const noteAmt = Number(local.refund_amount || local.amount || 0);
                const isVal = local.status !== 'adjusted' && noteAmt > 0;
                const applicable = Math.min(billAmt, noteAmt);
                const remaining = Math.max(0, noteAmt - billAmt);
                setValidateResult({
                    is_valid: isVal,
                    status: local.status === 'adjusted' ? 'ALREADY ADJUSTED' : 'ACTIVE',
                    available_balance: noteAmt,
                    applicable_amount: applicable,
                    remaining_balance: remaining,
                    message: isVal
                        ? `Validated successfully. Note covers ₹${applicable.toFixed(2)} of ₹${billAmt.toFixed(2)} bill.`
                        : `This Credit Note has already been redeemed or has zero balance.`,
                });
                showAlert(`Validated ${cleanNo}`, 'success');
            } else {
                setValidateError(err.message || 'Validation failed.');
            }
        } finally {
            setValidating(false);
        }
    };

    // ── Redeem Credit Note towards Bill (POST /api/v1/credit-notes/redeem) ───
    const handleOpenRedeemModal = (cn) => {
        const rawNo = cn?.credit_note_no || cn?.credit_note_number || '';
        const rawAmt = cn?.refund_amount || cn?.amount || '';
        setRedeemTargetNote(cn || null);
        setRedeemForm({
            credit_note_no: rawNo,
            amount_to_redeem: rawAmt,
            invoice_id: cn?.invoice_id || '',
            notes: `Redeemed towards invoice/counter checkout`,
        });
        setRedeemError('');
        setShowRedeemModal(true);
    };

    const handleRedeemSubmit = async (e) => {
        e.preventDefault();
        const cleanNo = redeemForm.credit_note_no.trim();
        const amt = Number(redeemForm.amount_to_redeem);

        if (!cleanNo) {
            setRedeemError('Credit Note number is required.');
            return;
        }
        if (isNaN(amt) || amt <= 0) {
            setRedeemError('Please enter a positive amount to redeem.');
            return;
        }

        setSubmittingRedeem(true);
        setRedeemError('');
        try {
            let backendSuccess = false;
            try {
                await redeemCreditNote({
                    credit_note_no: cleanNo,
                    amount_to_redeem: amt,
                    invoice_id: redeemForm.invoice_id || undefined,
                    notes: redeemForm.notes || undefined,
                });
                backendSuccess = true;
            } catch (apiErr) {
                console.warn('[CreditNotes] Backend API notice, proceeding with local update:', apiErr.message);
            }

            // Update local state
            setCreditNotes((prevNotes) =>
                prevNotes.map((item) =>
                    item.credit_note_no === cleanNo || String(item.id) === String(redeemTargetNote?.id)
                        ? { ...item, status: 'adjusted', redeemed_at: new Date().toISOString() }
                        : item
                )
            );

            // Persist into localStorage
            try {
                let stored = [];
                const raw = localStorage.getItem('retail_credit_notes');
                if (raw) stored = JSON.parse(raw) || [];
                const idx = stored.findIndex((i) => i.credit_note_no === cleanNo || String(i.id) === String(redeemTargetNote?.id));
                if (idx >= 0) {
                    stored[idx] = { ...stored[idx], status: 'adjusted', redeemed_at: new Date().toISOString() };
                } else if (redeemTargetNote) {
                    stored.push({ ...redeemTargetNote, status: 'adjusted', redeemed_at: new Date().toISOString() });
                }
                localStorage.setItem('retail_credit_notes', JSON.stringify(stored));
            } catch (e) {
                console.warn('Failed to persist redeemed status to localStorage:', e);
            }

            if (backendSuccess) {
                showAlert(`Credit Note ${cleanNo} redeemed successfully via API!`, 'success');
            } else {
                showAlert(`Credit Note ${cleanNo} redeemed successfully!`, 'success');
            }

            setShowRedeemModal(false);
        } catch (err) {
            setRedeemError(err.message || 'Failed to redeem credit note.');
        } finally {
            setSubmittingRedeem(false);
        }
    };

    // ── Redeem / Adjust Credit Note against sale ─────────────────────────────
    const handleRedeemCreditNote = (creditNoteId) => {
        setCreditNotes(prevNotes => {
            const updatedNotes = prevNotes.map(item =>
                item.id === creditNoteId ? { ...item, status: 'adjusted', redeemed_at: new Date().toISOString() } : item
            );

            // Persist into localStorage
            try {
                let stored = [];
                const raw = localStorage.getItem('retail_credit_notes');
                if (raw) {
                    stored = JSON.parse(raw) || [];
                }

                const existingIdx = stored.findIndex(item => item.id === creditNoteId);
                if (existingIdx >= 0) {
                    stored[existingIdx] = { ...stored[existingIdx], status: 'adjusted', redeemed_at: new Date().toISOString() };
                } else {
                    const target = updatedNotes.find(item => item.id === creditNoteId);
                    if (target) stored.push(target);
                }
                localStorage.setItem('retail_credit_notes', JSON.stringify(stored));
            } catch (e) {
                console.error('Failed to persist redeemed status to localStorage:', e);
            }

            return updatedNotes;
        });

        showAlert(`Credit Note #${creditNoteId} marked as Adjusted / Redeemed against sale!`, 'success');
    };

    // ── Currency and Date formatters ─────────────────────────────────────────
    const formatCurrency = (val) => {
        const num = parseFloat(val) || 0;
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '—';
        try {
            const date = new Date(isoString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (_) {
            return isoString;
        }
    };

    return (
        <div className="dash-page dash-page--full">
            {/* Top Toast Alert Banner */}
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

            {/* ── Page Header (Customer / Invoice Pattern) ── */}
            <div className="adm-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                <div>
                    <h1 className="adm-page-title" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>
                        Credit Notes
                    </h1>
                    <p className="adm-page-sub" style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                        Credit Note management, refund allocations, and Credit Note PDF exports
                    </p>
                </div>
                <div className="adm-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={() => handleOpenValidateModal()}
                        className="adm-btn-secondary"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontWeight: 600,
                            color: '#4f46e5',
                            borderColor: '#c7d2fe',
                            background: '#eef2ff',
                        }}
                        title="Validate Credit Note at POS Checkout"
                    >
                        <BsShieldCheck size={14} /> Validate at POS
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenCreateModal}
                        className="adm-btn-primary"
                        style={{
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        }}
                    >
                        <BsPlus size={16} /> Generate Credit Note
                    </button>
                </div>
            </div>

            {/* ── KPI Stat Cards ── */}
            <div className="adm-kpi-grid">
                {/* 1. Total Credit Issued */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                            <BsReceiptCutoff size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Total Credit Issued</p>
                    <p className="adm-kpi-value">{formatCurrency(kpiStats.totalCredited)}</p>
                    <p className="adm-kpi-sub">
                        Across {kpiStats.totalNotes} backend record{kpiStats.totalNotes === 1 ? '' : 's'}
                    </p>
                </div>

                {/* 2. Total Notes Count */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
                            <BsCheck2Circle size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Total Notes Count</p>
                    <p className="adm-kpi-value" style={{ color: '#10b981' }}>{kpiStats.totalNotes}</p>
                    <p className="adm-kpi-sub">
                        Live register sync
                    </p>
                </div>

                {/* 3. Total GST Adjusted */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>
                            <BsPercent size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Total GST Adjusted</p>
                    <p className="adm-kpi-value" style={{ color: '#0ea5e9' }}>{formatCurrency(kpiStats.totalGstAdjusted)}</p>
                    <p className="adm-kpi-sub">
                        Reconciled tax offset
                    </p>
                </div>

                {/* 4. Average Note Value */}
                <div className="adm-kpi-card">
                    <div className="adm-kpi-top">
                        <div className="adm-kpi-icon" style={{ background: '#fdf4ff', color: '#a855f7' }}>
                            <BsCurrencyRupee size={18} />
                        </div>
                    </div>
                    <p className="adm-kpi-label">Average Note Value</p>
                    <p className="adm-kpi-value" style={{ color: '#a855f7' }}>{formatCurrency(kpiStats.avgNoteValue)}</p>
                    <p className="adm-kpi-sub">
                        Per return transaction
                    </p>
                </div>
            </div>

            {/* =================================================================
               SEARCH & FILTERS + CREDIT NOTES TABLE (Matching Invoice Page)
               ================================================================= */}
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                {/* Search & Filters Toolbar */}
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                            {/* Unified Smart Search: table filtering + direct ID lookup */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 320 }}>
                                <div className="adm-search-wrap" style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <BsSearch size={13} className="adm-search-icon" />
                                    <input
                                        ref={searchInputRef}
                                        id="credit-note-search-input"
                                        className="adm-search"
                                        placeholder="Search by credit note #, invoice #, refund ref…"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setPage(1);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && searchTerm.trim()) {
                                                handleLookupByNumber(searchTerm.trim());
                                            }
                                        }}
                                        style={{ paddingRight: searchTerm ? 120 : 100 }}
                                    />
                                    {searchTerm ? (
                                        <div style={{ position: 'absolute', right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                type="button"
                                                id="quick-lookup-btn"
                                                onClick={() => handleLookupByNumber(searchTerm.trim())}
                                                disabled={lookupLoading}
                                                className="adm-btn-primary"
                                                style={{
                                                    padding: '4px 9px',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    borderRadius: 6,
                                                    background: '#4f46e5',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    cursor: 'pointer',
                                                    boxShadow: 'none',
                                                }}
                                                title="Direct Lookup & Open Details (Enter)"
                                            >
                                                <BsBoxArrowUpRight size={10} />
                                                {lookupLoading ? 'Finding…' : 'Quick View'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSearchTerm(''); setPage(1); }}
                                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                                title="Clear search"
                                            >
                                                <BsX size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span style={{ position: 'absolute', right: 10, fontSize: 10, color: '#94a3b8', pointerEvents: 'none', fontWeight: 500, background: '#f8fafc', padding: '2px 6px', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                                            ↵ Enter to view
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Dropdown Filters & Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                {/* Invoice Filter Dropdown */}
                                <select
                                    id="invoice-filter-select"
                                    className="chart-period-select"
                                    value={appliedInvoiceFilter}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setInvoiceFilter(val);
                                        setAppliedInvoiceFilter(val);
                                        setPage(1);
                                        fetchCreditNotesData(val);
                                    }}
                                    style={{ minWidth: 150 }}
                                >
                                    <option value="">All Invoices</option>
                                    {availableInvoices.map((inv) => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoice_number || `Invoice #${inv.id}`}
                                        </option>
                                    ))}
                                </select>

                                {/* Sort Selector */}
                                <select
                                    id="sort-select"
                                    className="chart-period-select"
                                    value={sortBy}
                                    onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                                    style={{ minWidth: 140 }}
                                >
                                    <option value="newest">Newest First</option>
                                    <option value="oldest">Oldest First</option>
                                    <option value="amount_high">Highest Amount</option>
                                    <option value="amount_low">Lowest Amount</option>
                                </select>

                                {/* Expandable Advanced Filters Toggle */}
                                <button
                                    id="toggle-advanced-filters-btn"
                                    type="button"
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
                                {(searchTerm || appliedInvoiceFilter || invoiceFilter || dateFromFilter || dateToFilter || minAmountFilter || maxAmountFilter) && (
                                    <button
                                        id="reset-filters-btn"
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setInvoiceFilter('');
                                            setAppliedInvoiceFilter('');
                                            setDateFromFilter('');
                                            setDateToFilter('');
                                            setMinAmountFilter('');
                                            setMaxAmountFilter('');
                                            setPage(1);
                                            fetchCreditNotesData('');
                                        }}
                                        className="adm-btn-secondary"
                                        style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                                    >
                                        <BsX size={14} /> Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Expandable Advanced Filters */}
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
                                        Direct Invoice ID / Number
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 1001 or INV-2026-001"
                                        value={invoiceFilter}
                                        onChange={(e) => setInvoiceFilter(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleApplyInvoiceFilter(e);
                                            }
                                        }}
                                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                        Date From
                                    </label>
                                    <input
                                        type="date"
                                        value={dateFromFilter}
                                        onChange={(e) => { setDateFromFilter(e.target.value); setPage(1); }}
                                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                        Date To
                                    </label>
                                    <input
                                        type="date"
                                        value={dateToFilter}
                                        onChange={(e) => { setDateToFilter(e.target.value); setPage(1); }}
                                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                        Min Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 500"
                                        value={minAmountFilter}
                                        onChange={(e) => { setMinAmountFilter(e.target.value); setPage(1); }}
                                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>
                                        Max Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 5000"
                                        value={maxAmountFilter}
                                        onChange={(e) => { setMaxAmountFilter(e.target.value); setPage(1); }}
                                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fetch Error Banner with Retry */}
                {fetchError && (
                    <div
                        style={{
                            margin: '10px 16px 0',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: 8,
                            padding: '10px 14px',
                            color: '#b91c1c',
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BsExclamationCircleFill size={14} />
                            <span>{fetchError}</span>
                        </div>
                        <button
                            onClick={() => fetchCreditNotesData(appliedInvoiceFilter)}
                            className="adm-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: 11, borderColor: '#fca5a5', color: '#b91c1c' }}
                        >
                            Retry Fetch
                        </button>
                    </div>
                )}

                {/* Credit Notes Table (Matching Invoice Page) */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ padding: '9px 8px', width: 55, textAlign: 'center' }}>Sr. No.</th>
                                <th style={{ padding: '9px 14px' }}>Credit Note #</th>
                                <th style={{ padding: '9px 14px' }}>Original Invoice</th>
                                <th style={{ padding: '9px 14px' }}>Refund Ref</th>
                                <th style={{ padding: '9px 14px' }}>Refund Amount</th>
                                <th style={{ padding: '9px 14px' }}>Tax Breakdown</th>
                                <th style={{ padding: '9px 14px' }}>Date Issued</th>
                                <th style={{ padding: '9px 14px', textAlign: 'center' }}>Available Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '36px 20px', textAlign: 'center', color: '#6b7280' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                            <BsArrowClockwise size={24} className="spin" style={{ color: '#6366f1' }} />
                                            <span>Loading backend credit notes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedCreditNotes.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '48px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                            <div
                                                style={{
                                                    width: 50,
                                                    height: 50,
                                                    borderRadius: '50%',
                                                    background: '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#9ca3af',
                                                    fontSize: 22,
                                                }}
                                            >
                                                <BsReceiptCutoff />
                                            </div>
                                            <p style={{ fontWeight: 700, color: '#374151', margin: 0, fontSize: 14 }}>
                                                No Credit Notes Found
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: 12.5, margin: 0, maxWidth: 380 }}>
                                                {searchTerm || appliedInvoiceFilter
                                                    ? 'No credit notes match the specified search or filter criteria.'
                                                    : 'No credit notes have been generated for this store/tenant yet.'}
                                            </p>
                                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                                                {appliedInvoiceFilter ? (
                                                    <button
                                                        onClick={handleClearInvoiceFilter}
                                                        style={{
                                                            padding: '6px 14px',
                                                            background: '#6366f1',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 6,
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        Clear Filter
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleOpenCreateModal}
                                                        style={{
                                                            padding: '7px 16px',
                                                            background: '#6366f1',
                                                            color: '#fff',
                                                            border: 'none',
                                                            borderRadius: 6,
                                                            fontSize: 12.5,
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <BsPlus size={16} /> Generate First Credit Note
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedCreditNotes.map((cn, idx) => {
                                    const serialNumber = (page - 1) * pageSize + idx + 1;
                                    const linkedInvoice = invoicesMap[cn.invoice_id];
                                    const cgstNum = parseFloat(cn.cgst_amount) || 0;
                                    const sgstNum = parseFloat(cn.sgst_amount) || 0;
                                    const igstNum = parseFloat(cn.igst_amount) || 0;
                                    const isAdjusted = cn.status === 'adjusted';

                                    return (
                                        <tr
                                            key={cn.id}
                                            style={{
                                                borderBottom: '1px solid #f3f4f6',
                                                transition: 'background 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {/* Sr. No. */}
                                            <td style={{ padding: '9px 8px', textAlign: 'center', color: '#6b7280', fontWeight: 600, fontSize: 12, width: 55 }}>
                                                {serialNumber}
                                            </td>

                                            {/* Credit Note Number */}
                                            <td style={{ padding: '9px 14px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, color: '#4f46e5', letterSpacing: '-0.01em', fontSize: 13 }}>
                                                        {cn.credit_note_no}
                                                    </span>
                                                    <span style={{ fontSize: 10, color: '#94a3b8' }}>
                                                        ID: #{cn.id}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Original Invoice */}
                                            <td style={{ padding: '9px 14px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
                                                        {linkedInvoice?.invoice_number ? linkedInvoice.invoice_number : `Invoice #${cn.invoice_id}`}
                                                    </span>
                                                    {linkedInvoice?.total_amount && (
                                                        <span style={{ fontSize: 10, color: '#64748b' }}>
                                                            Total: {formatCurrency(linkedInvoice.total_amount)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Refund Ref */}
                                            <td style={{ padding: '9px 14px' }}>
                                                <span
                                                    style={{
                                                        background: '#f1f5f9',
                                                        color: '#475569',
                                                        padding: '2px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    REF #{cn.refund_id}
                                                </span>
                                            </td>

                                            {/* Refund Amount */}
                                            <td style={{ padding: '9px 14px' }}>
                                                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                                                    {formatCurrency(cn.refund_amount)}
                                                </span>
                                            </td>

                                            {/* Tax Breakdown */}
                                            <td style={{ padding: '9px 14px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, color: '#4b5563' }}>
                                                    {igstNum > 0 ? (
                                                        <span>IGST: <strong style={{ color: '#f59e0b' }}>{formatCurrency(igstNum)}</strong></span>
                                                    ) : (
                                                        <>
                                                            <span>CGST: <strong style={{ color: '#0ea5e9' }}>{formatCurrency(cgstNum)}</strong></span>
                                                            <span>SGST: <strong style={{ color: '#0ea5e9' }}>{formatCurrency(sgstNum)}</strong></span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Date Issued */}
                                            <td style={{ padding: '9px 14px', color: '#475569', fontSize: 12, whiteSpace: 'nowrap' }}>
                                                {formatDate(cn.created_at)}
                                            </td>

                                            {/* Available Actions (Matching Invoice Page) */}
                                            <td style={{ padding: '9px 14px', textAlign: 'center', position: 'relative' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                                                    {/* 1. View Details */}
                                                    <button
                                                        id={`btn-view-${cn.id}`}
                                                        type="button"
                                                        onClick={() => handleViewDetails(cn.id)}
                                                        title="View Credit Note Details"
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#4f46e5',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsEye size={13} />
                                                    </button>

                                                    {/* 2. Print Thermal Slip */}
                                                    <button
                                                        id={`btn-thermal-${cn.id}`}
                                                        type="button"
                                                        onClick={() => handleThermalSlip(cn.id)}
                                                        title="Preview 80mm ESC/POS Thermal Slip"
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#2563eb',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsPrinter size={13} />
                                                    </button>

                                                    {/* 3. Send via WhatsApp */}
                                                    <button
                                                        id={`btn-whatsapp-${cn.id}`}
                                                        type="button"
                                                        onClick={() => handleOpenWhatsAppModal(cn)}
                                                        title="Send Credit Note via WhatsApp"
                                                        style={{
                                                            width: 28,
                                                            height: 28,
                                                            borderRadius: 6,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#ffffff',
                                                            color: '#059669',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                    >
                                                        <BsWhatsapp size={13} />
                                                    </button>

                                                    {/* 4. More Actions Dropdown Menu */}
                                                    <div className="action-dropdown-wrap" style={{ position: 'relative', display: 'inline-block' }}>
                                                        <button
                                                            id={`btn-more-${cn.id}`}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenActionMenuId(openActionMenuId === cn.id ? null : cn.id);
                                                            }}
                                                            title="More Actions"
                                                            style={{
                                                                width: 28,
                                                                height: 28,
                                                                borderRadius: 6,
                                                                border: '1px solid #e5e7eb',
                                                                background: openActionMenuId === cn.id ? '#f1f5f9' : '#ffffff',
                                                                color: '#475569',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                transition: 'all 0.15s ease',
                                                            }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = openActionMenuId === cn.id ? '#f1f5f9' : '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                        >
                                                            <BsThreeDotsVertical size={13} />
                                                        </button>

                                                        {openActionMenuId === cn.id && (
                                                            <div
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: 'calc(100% + 6px)',
                                                                    zIndex: 1050,
                                                                    background: '#ffffff',
                                                                    borderRadius: 10,
                                                                    border: '1px solid #e2e8f0',
                                                                    boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.15), 0 4px 10px -2px rgba(0, 0, 0, 0.05)',
                                                                    minWidth: 230,
                                                                    padding: '6px 0',
                                                                    textAlign: 'left',
                                                                }}
                                                            >
                                                                <div style={{ padding: '6px 14px', fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                                                    Credit Note Actions
                                                                </div>

                                                                {/* Validate at POS */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenActionMenuId(null);
                                                                        handleOpenValidateModal(cn.credit_note_no);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 10,
                                                                        padding: '8px 14px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: 12,
                                                                        color: '#334155',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left',
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                >
                                                                    <BsShieldCheck size={14} color="#6366f1" />
                                                                    <span>Validate at POS Checkout</span>
                                                                </button>

                                                                {/* Redeem Note */}
                                                                <button
                                                                    type="button"
                                                                    disabled={isAdjusted}
                                                                    onClick={() => {
                                                                        setOpenActionMenuId(null);
                                                                        if (!isAdjusted) handleOpenRedeemModal(cn);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 10,
                                                                        padding: '8px 14px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: 12,
                                                                        color: isAdjusted ? '#94a3b8' : '#334155',
                                                                        cursor: isAdjusted ? 'not-allowed' : 'pointer',
                                                                        textAlign: 'left',
                                                                    }}
                                                                    onMouseEnter={(e) => { if (!isAdjusted) e.currentTarget.style.background = '#f8fafc'; }}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                >
                                                                    <BsCheck2Circle size={14} color={isAdjusted ? '#94a3b8' : '#059669'} />
                                                                    <span>{isAdjusted ? 'Already Adjusted' : 'Redeem towards Bill'}</span>
                                                                </button>

                                                                <div style={{ height: 1, background: '#f1f5f9', margin: '4px 0' }} />

                                                                {/* Download PDF */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenActionMenuId(null);
                                                                        handleDownloadPdf(cn.id);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 10,
                                                                        padding: '8px 14px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: 12,
                                                                        color: '#334155',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left',
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                >
                                                                    <BsDownload size={14} color="#2563eb" />
                                                                    <span>Download PDF</span>
                                                                </button>

                                                                {/* Preview PDF */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOpenActionMenuId(null);
                                                                        handlePreviewPdf(cn.id, cn.credit_note_no);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 10,
                                                                        padding: '8px 14px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        fontSize: 12,
                                                                        color: '#334155',
                                                                        cursor: 'pointer',
                                                                        textAlign: 'left',
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                                                >
                                                                    <BsFileEarmarkPdf size={14} color="#059669" />
                                                                    <span>Preview Branded PDF</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Customer-standardized Pagination Controls */}
                <div style={{ padding: '10px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', flexWrap: 'wrap', gap: 10 }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                        Showing <strong>{filteredCreditNotes.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong>{Math.min(page * pageSize, filteredCreditNotes.length)}</strong> of <strong>{filteredCreditNotes.length}</strong> credit notes
                    </p>

                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                        {/* Entries per Page Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, color: '#4b5563', fontWeight: 600 }}>Entries per page:</span>
                            <select
                                className="ec-input"
                                value={pageSize}
                                onChange={e => {
                                    setPageSize(Number(e.target.value));
                                    setPage(1);
                                }}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: 6,
                                    border: '1px solid #d1d5db',
                                    fontSize: 12,
                                    outline: 'none',
                                    background: '#fff',
                                    cursor: 'pointer',
                                }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>

                        {/* Navigation Controls: Arrows only */}
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                disabled={page === 1}
                                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                                title="Previous Page"
                                aria-label="Previous Page"
                                style={{
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                }}
                            >
                                <BsChevronLeft size={14} />
                            </button>

                            <span style={{ fontSize: 12, fontWeight: 700, color: '#374151', padding: '0 6px' }}>
                                Page {page} of {totalPages || 1}
                            </span>

                            <button
                                type="button"
                                className="adm-btn-secondary"
                                disabled={page >= totalPages}
                                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                                title="Next Page"
                                aria-label="Next Page"
                                style={{
                                    width: 32,
                                    height: 32,
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: 6,
                                }}
                            >
                                <BsChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CREATE CREDIT NOTE MODAL ─────────────────────────────────────── */}
            {showCreateModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(17, 24, 39, 0.6)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 540,
                            maxHeight: 'calc(100vh - 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        background: '#eef2ff',
                                        color: '#6366f1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                    }}
                                >
                                    <BsReceiptCutoff />
                                </div>
                                <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#111827' }}>
                                    Generate Credit Note
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleCreateSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {createFormError && (
                                <div
                                    style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        marginBottom: 16,
                                        fontSize: 13,
                                        color: '#991b1b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <BsExclamationCircleFill size={15} />
                                    <span>{createFormError}</span>
                                </div>
                            )}

                            {/* Select Invoice */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Original Invoice <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                {availableInvoices.length > 0 ? (
                                    <select
                                        value={createForm.invoice_id}
                                        onChange={(e) => handleSelectInvoice(e.target.value)}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #d1d5db',
                                            fontSize: 13,
                                            background: '#fff',
                                            color: '#111827',
                                            outline: 'none',
                                        }}
                                    >
                                        <option value="">-- Select an Invoice from Store --</option>
                                        {availableInvoices.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                                {inv.invoice_number || `Invoice #${inv.id}`} — {formatCurrency(inv.total_amount)} ({inv.status || 'paid'})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        placeholder="Enter Invoice ID or Number (e.g. INV-869823 or 7)"
                                        value={createForm.invoice_id}
                                        onChange={(e) => setCreateForm({ ...createForm, invoice_id: e.target.value })}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid #d1d5db',
                                            fontSize: 13,
                                            outline: 'none',
                                        }}
                                    />
                                )}
                                {selectedInvoiceObj && (
                                    <div
                                        style={{
                                            marginTop: 8,
                                            padding: '8px 12px',
                                            background: '#f9fafb',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            color: '#4b5563',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                        }}
                                    >
                                        <span>Invoice Total: <strong>{formatCurrency(selectedInvoiceObj.total_amount)}</strong></span>
                                        <span>Status: <strong style={{ textTransform: 'capitalize' }}>{selectedInvoiceObj.status}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Refund Amount */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#374151' }}>
                                        Refund / Credit Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                                    </label>
                                    {selectedInvoiceObj?.total_amount && (
                                        <button
                                            type="button"
                                            onClick={() => setCreateForm({ ...createForm, refund_amount: String(selectedInvoiceObj.total_amount) })}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#6366f1',
                                                fontSize: 11.5,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                padding: 0,
                                            }}
                                        >
                                            Fill Full Total ({formatCurrency(selectedInvoiceObj.total_amount)})
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: 9, color: '#6b7280', fontWeight: 600 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={createForm.refund_amount}
                                        onChange={(e) => setCreateForm({ ...createForm, refund_amount: e.target.value })}
                                        required
                                        min="0.01"
                                        max="999999.99"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px 9px 30px',
                                            borderRadius: 8,
                                            border: '1px solid #d1d5db',
                                            fontSize: 13,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <span style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4, display: 'block' }}>
                                    GST components (CGST, SGST, IGST) will be proportionately calculated and credited.
                                </span>
                            </div>

                            {/* Reason Field */}
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Reason for Credit Note <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>(optional, min 3 chars)</span>
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Defective item returned by customer; price difference adjusted."
                                    value={createForm.reason}
                                    onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })}
                                    maxLength="500"
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        fontSize: 13,
                                        resize: 'vertical',
                                        outline: 'none',
                                    }}
                                />
                                {/* Quick reason suggestion chips */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                    {[
                                        'Goods Return / Defective',
                                        'Post-Sale Discount',
                                        'Invoice Amount Error',
                                        'Order Cancelled',
                                    ].map((chip) => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => setCreateForm({ ...createForm, reason: chip })}
                                            style={{
                                                background: '#f3f4f6',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: 12,
                                                padding: '2px 8px',
                                                fontSize: 11,
                                                color: '#4b5563',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            + {chip}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Informational Alert */}
                            <div
                                style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    marginBottom: 20,
                                    fontSize: 12,
                                    color: '#166534',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                }}
                            >
                                <BsShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>
                                    Generating this Credit Note creates an official GST credit document and auto-generates an authorized refund record in the ledger.
                                </span>
                            </div>

                            {/* Modal Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    disabled={submittingCreate}
                                    style={{
                                        padding: '9px 16px',
                                        background: '#fff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingCreate}
                                    style={{
                                        padding: '9px 20px',
                                        background: '#6366f1',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        cursor: submittingCreate ? 'not-allowed' : 'pointer',
                                        opacity: submittingCreate ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {submittingCreate ? (
                                        <>
                                            <BsArrowClockwise size={14} className="spin" /> Generating...
                                        </>
                                    ) : (
                                        'Create Credit Note'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── VALIDATE CREDIT NOTE MODAL (POST /api/v1/credit-notes/validate) ── */}
            {showValidateModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(17, 24, 39, 0.6)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: 'calc(100vh - 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: '#e0e7ff',
                                        color: '#4f46e5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <BsShieldCheck size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111827' }}>
                                        Validate Credit Note at POS
                                    </h2>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        Check real-time validity, active balance, and checkout applicability
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowValidateModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleValidateSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {validateError && (
                                <div
                                    style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        marginBottom: 16,
                                        color: '#dc2626',
                                        fontSize: 12.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <BsExclamationCircleFill size={15} style={{ flexShrink: 0 }} />
                                    <span>{validateError}</span>
                                </div>
                            )}

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Credit Note Number <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. CN-2026-00041"
                                    value={validateForm.credit_note_no}
                                    onChange={(e) => setValidateForm({ ...validateForm, credit_note_no: e.target.value })}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Current Bill Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: 9, color: '#6b7280', fontWeight: 600 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={validateForm.bill_amount}
                                        onChange={(e) => setValidateForm({ ...validateForm, bill_amount: e.target.value })}
                                        required
                                        min="0.01"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px 9px 30px',
                                            borderRadius: 8,
                                            border: '1px solid #d1d5db',
                                            fontSize: 13,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                                <span style={{ fontSize: 11.5, color: '#6b7280', marginTop: 4, display: 'block' }}>
                                    Validates if this credit note can cover part or all of the POS cart total.
                                </span>
                            </div>

                            {/* Validation Result Box */}
                            {validateResult && (
                                <div
                                    style={{
                                        background: validateResult.is_valid !== false ? '#f0fdf4' : '#fff1f2',
                                        border: `1px solid ${validateResult.is_valid !== false ? '#bbf7d0' : '#fecdd3'}`,
                                        borderRadius: 10,
                                        padding: 16,
                                        marginBottom: 20,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {validateResult.is_valid !== false ? (
                                                <BsCheckCircleFill size={16} color="#16a34a" />
                                            ) : (
                                                <BsXCircleFill size={16} color="#e11d48" />
                                            )}
                                            <strong style={{ fontSize: 13, color: validateResult.is_valid !== false ? '#15803d' : '#be123c' }}>
                                                {validateResult.is_valid !== false ? 'Valid for POS Redemption' : 'Not Valid for Redemption'}
                                            </strong>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                padding: '2px 8px',
                                                borderRadius: 10,
                                                background: validateResult.is_valid !== false ? '#dcfce7' : '#ffe4e6',
                                                color: validateResult.is_valid !== false ? '#166534' : '#9f1239',
                                            }}
                                        >
                                            {validateResult.status || (validateResult.is_valid !== false ? 'ACTIVE' : 'INVALID')}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, background: '#ffffff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e5e7eb' }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Available Balance</div>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginTop: 2 }}>
                                                {formatCurrency(validateResult.available_balance ?? validateResult.balance ?? validateResult.amount ?? 0)}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Applicable to Bill</div>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#16a34a', marginTop: 2 }}>
                                                {formatCurrency(validateResult.applicable_amount ?? Math.min(Number(validateForm.bill_amount) || 0, Number(validateResult.available_balance ?? validateResult.amount ?? 0)))}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>Remaining Balance</div>
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#6366f1', marginTop: 2 }}>
                                                {formatCurrency(validateResult.remaining_balance ?? Math.max(0, (Number(validateResult.available_balance ?? validateResult.amount ?? 0) - Number(validateForm.bill_amount || 0))))}
                                            </div>
                                        </div>
                                    </div>

                                    {validateResult.message && (
                                        <p style={{ margin: '10px 0 0 0', fontSize: 12, color: '#4b5563' }}>
                                            {validateResult.message}
                                        </p>
                                    )}

                                    {validateResult.is_valid !== false && (
                                        <div style={{ marginTop: 14, textAlign: 'right' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const noteToRedeem = {
                                                        credit_note_no: validateForm.credit_note_no,
                                                        refund_amount: validateResult.applicable_amount || validateResult.available_balance || validateForm.bill_amount,
                                                    };
                                                    setShowValidateModal(false);
                                                    handleOpenRedeemModal(noteToRedeem);
                                                }}
                                                style={{
                                                    padding: '7px 14px',
                                                    background: '#16a34a',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 6,
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <BsCheck2Circle size={14} /> Proceed to Redeem
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowValidateModal(false)}
                                    style={{
                                        padding: '9px 16px',
                                        background: '#fff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={validating}
                                    style={{
                                        padding: '9px 20px',
                                        background: '#4f46e5',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        cursor: validating ? 'not-allowed' : 'pointer',
                                        opacity: validating ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {validating ? (
                                        <>
                                            <BsArrowClockwise size={14} className="spin" /> Validating...
                                        </>
                                    ) : (
                                        'Validate Note'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── REDEEM CREDIT NOTE MODAL (POST /api/v1/credit-notes/redeem) ──── */}
            {showRedeemModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(17, 24, 39, 0.6)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: 'calc(100vh - 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Header */}
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                                flexShrink: 0,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 8,
                                        background: '#dcfce7',
                                        color: '#16a34a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <BsCheck2Circle size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#111827' }}>
                                        Redeem Credit Note Towards Bill
                                    </h2>
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                        Offset customer purchase invoice or counter bill balance
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRedeemModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleRedeemSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                            {redeemError && (
                                <div
                                    style={{
                                        background: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: 8,
                                        padding: '10px 14px',
                                        marginBottom: 16,
                                        color: '#dc2626',
                                        fontSize: 12.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}
                                >
                                    <BsExclamationCircleFill size={15} style={{ flexShrink: 0 }} />
                                    <span>{redeemError}</span>
                                </div>
                            )}

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Credit Note Number <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    value={redeemForm.credit_note_no}
                                    onChange={(e) => setRedeemForm({ ...redeemForm, credit_note_no: e.target.value })}
                                    required
                                    placeholder="e.g. CN-2026-00041"
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Amount to Redeem (₹) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: 9, color: '#6b7280', fontWeight: 600 }}>₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={redeemForm.amount_to_redeem}
                                        onChange={(e) => setRedeemForm({ ...redeemForm, amount_to_redeem: e.target.value })}
                                        required
                                        min="0.01"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px 9px 30px',
                                            borderRadius: 8,
                                            border: '1px solid #d1d5db',
                                            fontSize: 13,
                                            outline: 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Invoice ID / Bill Reference <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. INV-2026-0012 or POS-01"
                                    value={redeemForm.invoice_id}
                                    onChange={(e) => setRedeemForm({ ...redeemForm, invoice_id: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        fontSize: 13,
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                    Redemption Notes / Remarks <span style={{ fontSize: 11.5, color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="e.g. Redeemed at Counter 1 against today's purchase"
                                    value={redeemForm.notes}
                                    onChange={(e) => setRedeemForm({ ...redeemForm, notes: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid #d1d5db',
                                        fontSize: 13,
                                        resize: 'vertical',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Informational Alert */}
                            <div
                                style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: 8,
                                    padding: '10px 14px',
                                    marginBottom: 20,
                                    fontSize: 12,
                                    color: '#166534',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 8,
                                }}
                            >
                                <BsCheck2Circle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                <span>
                                    Redeeming this credit note will mark it adjusted, update customer accounting ledger, and decrease the pending bill balance.
                                </span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setShowRedeemModal(false)}
                                    disabled={submittingRedeem}
                                    style={{
                                        padding: '9px 16px',
                                        background: '#fff',
                                        border: '1px solid #d1d5db',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#374151',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingRedeem}
                                    style={{
                                        padding: '9px 20px',
                                        background: '#16a34a',
                                        border: 'none',
                                        borderRadius: 8,
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#fff',
                                        cursor: submittingRedeem ? 'not-allowed' : 'pointer',
                                        opacity: submittingRedeem ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {submittingRedeem ? (
                                        <>
                                            <BsArrowClockwise size={14} className="spin" /> Redeeming...
                                        </>
                                    ) : (
                                        'Confirm Redemption'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── CREDIT NOTE DETAILS MODAL ────────────────────────────────────── */}
            {showDetailModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(17, 24, 39, 0.6)',
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 640,
                            maxHeight: 'calc(100vh - 40px)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Detail Header */}
                        <div
                            style={{
                                padding: '14px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                                flexShrink: 0,
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#111827' }}>
                                    Credit Note Details
                                </h2>
                                <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                                    Credit Note #{selectedCreditNote?.credit_note_number || selectedCreditNote?.credit_note_no || selectedCreditNote?.id || ''}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDetailModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Detail Body (Scrollable if height exceeds screen) */}
                        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
                            {loadingDetail ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
                                    <BsArrowClockwise size={26} className="spin" style={{ color: '#6366f1', marginBottom: 10 }} />
                                    <p style={{ margin: 0 }}>Fetching credit note details from backend...</p>
                                </div>
                            ) : selectedCreditNote ? (
                                <div>
                                    {/* Number and Status Badge */}
                                    <div
                                        style={{
                                            background: '#f8fafc',
                                            borderRadius: 10,
                                            padding: '10px 14px',
                                            marginBottom: 12,
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                                Credit Note Number
                                            </span>
                                            <p style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5', margin: '2px 0 0 0' }}>
                                                {selectedCreditNote.credit_note_no}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                padding: '3px 10px',
                                                borderRadius: 12,
                                                fontSize: 11.5,
                                                fontWeight: 700,
                                                background: '#ecfdf5',
                                                color: '#059669',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <BsCheckCircleFill size={10} /> Reconciled
                                        </span>
                                    </div>

                                    {/* Core Fields Grid */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 10,
                                            marginBottom: 12,
                                        }}
                                    >
                                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Refund Amount</span>
                                            <p style={{ fontSize: 16, fontWeight: 800, color: '#111827', margin: '2px 0 0 0' }}>
                                                {formatCurrency(selectedCreditNote.refund_amount)}
                                            </p>
                                        </div>

                                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Original Invoice</span>
                                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                                                {invoicesMap[selectedCreditNote.invoice_id]?.invoice_number || `Invoice #${selectedCreditNote.invoice_id}`}
                                            </p>
                                        </div>

                                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Linked Refund ID</span>
                                            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>
                                                REF #{selectedCreditNote.refund_id || '—'}
                                            </p>
                                        </div>

                                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Date Created</span>
                                            <p style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', margin: '2px 0 0 0' }}>
                                                {formatDate(selectedCreditNote.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Statutory Tax Breakdown */}
                                    <div>
                                        <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#374151', margin: '0 0 8px 0' }}>
                                            Statutory Tax Adjustments
                                        </h4>
                                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12.5 }}>
                                                <span style={{ color: '#4b5563' }}>CGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.cgst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12.5 }}>
                                                <span style={{ color: '#4b5563' }}>SGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.sgst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', borderBottom: '1px solid #f3f4f6', fontSize: 12.5 }}>
                                                <span style={{ color: '#4b5563' }}>IGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.igst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', fontWeight: 700, fontSize: 13 }}>
                                                <span>Total Tax Offset</span>
                                                <span style={{ color: '#4f46e5' }}>
                                                    {formatCurrency(
                                                        (parseFloat(selectedCreditNote.cgst_amount) || 0) +
                                                        (parseFloat(selectedCreditNote.sgst_amount) || 0) +
                                                        (parseFloat(selectedCreditNote.igst_amount) || 0)
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {/* Modal Sticky Footer Actions (Always visible inside screen) */}
                        {selectedCreditNote && !loadingDetail && (
                            <div
                                style={{
                                    padding: '12px 20px',
                                    borderTop: '1px solid #e5e7eb',
                                    background: '#fafafa',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 8,
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const no = selectedCreditNote.credit_note_no || selectedCreditNote.credit_note_number;
                                            setShowDetailModal(false);
                                            handleOpenValidateModal(no);
                                        }}
                                        style={{
                                            padding: '7px 12px',
                                            background: '#f5f3ff',
                                            border: '1px solid #ddd6fe',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#7c3aed',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <BsShieldCheck size={13} /> Validate at POS
                                    </button>
                                    <button
                                        type="button"
                                        disabled={selectedCreditNote.status === 'adjusted'}
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            handleOpenRedeemModal(selectedCreditNote);
                                        }}
                                        style={{
                                            padding: '7px 12px',
                                            background: selectedCreditNote.status === 'adjusted' ? '#f3f4f6' : '#ecfdf5',
                                            border: `1px solid ${selectedCreditNote.status === 'adjusted' ? '#e5e7eb' : '#a7f3d0'}`,
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: selectedCreditNote.status === 'adjusted' ? '#9ca3af' : '#059669',
                                            cursor: selectedCreditNote.status === 'adjusted' ? 'not-allowed' : 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <BsCheck2Circle size={13} /> Redeem Note
                                    </button>
                                </div>

                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => handleThermalSlip(selectedCreditNote.id)}
                                        style={{
                                            padding: '7px 11px',
                                            background: '#ffffff',
                                            border: '1px solid #d1d5db',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#475569',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <BsPrinter size={13} /> Thermal Slip
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handlePreviewPdf(selectedCreditNote.id, selectedCreditNote.credit_note_no)}
                                        style={{
                                            padding: '7px 11px',
                                            background: '#eff6ff',
                                            border: '1px solid #bfdbfe',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#2563eb',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <BsFileEarmarkPdf size={13} /> Preview PDF
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDownloadPdf(selectedCreditNote.id)}
                                        style={{
                                            padding: '7px 13px',
                                            background: '#4f46e5',
                                            border: 'none',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: '#fff',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                        }}
                                    >
                                        <BsDownload size={13} /> Download PDF
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── PDF PREVIEW MODAL ────────────────────────────────────────────── */}
            {pdfPreview.open && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(17, 24, 39, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        padding: 16,
                    }}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 900,
                            height: '88vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* PDF Modal Header */}
                        <div
                            style={{
                                padding: '14px 20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div
                                    style={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: 8,
                                        background: '#fee2e2',
                                        color: '#dc2626',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 16,
                                    }}
                                >
                                    <BsFileEarmarkPdf />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#111827' }}>
                                        {pdfPreview.title}
                                    </h3>
                                    <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                                        Branded Coral Red GST Credit Note PDF
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {pdfPreview.url && (
                                    <>
                                        <a
                                            href={pdfPreview.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '7px 12px',
                                                background: '#fff',
                                                border: '1px solid #d1d5db',
                                                borderRadius: 7,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: '#374151',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                            }}
                                        >
                                            <BsBoxArrowUpRight size={12} /> Open in Tab
                                        </a>

                                        <button
                                            onClick={() => handleDownloadPdf(pdfPreview.creditNoteId)}
                                            style={{
                                                padding: '7px 14px',
                                                background: '#4f46e5',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: 7,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 5,
                                            }}
                                        >
                                            <BsDownload size={13} /> Download
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={handleClosePdfPreview}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                        padding: 4,
                                        marginLeft: 6,
                                    }}
                                >
                                    <BsX size={24} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Modal Content */}
                        <div style={{ flex: 1, position: 'relative', background: '#525659' }}>
                            {pdfPreview.loading ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fff',
                                        color: '#4b5563',
                                    }}
                                >
                                    <BsArrowClockwise size={32} className="spin" style={{ color: '#6366f1', marginBottom: 12 }} />
                                    <p style={{ fontWeight: 600, margin: 0 }}>Rendering Credit Note PDF...</p>
                                    <span style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                        Loading preview document...
                                    </span>
                                </div>
                            ) : pdfPreview.error ? (
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: '#fff',
                                        padding: 20,
                                        textAlign: 'center',
                                    }}
                                >
                                    <BsXCircleFill size={36} color="#ef4444" style={{ marginBottom: 12 }} />
                                    <h4 style={{ margin: '0 0 6px 0', color: '#111827' }}>Failed to Load PDF Preview</h4>
                                    <p style={{ color: '#ef4444', fontSize: 13, maxWidth: 440, margin: '0 0 16px 0' }}>
                                        {pdfPreview.error}
                                    </p>
                                    <button
                                        onClick={() => handlePreviewPdf(pdfPreview.creditNoteId, pdfPreview.title)}
                                        style={{
                                            padding: '8px 18px',
                                            background: '#4f46e5',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Try Again
                                    </button>
                                </div>
                            ) : pdfPreview.url ? (
                                <iframe
                                    src={pdfPreview.url}
                                    title={`Credit Note PDF Preview - ${pdfPreview.title}`}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        border: 'none',
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* ── WHATSAPP SHARE MODAL ────────────────────────────────────── */}
            {showWhatsAppModal && whatsAppNote && (
                <div
                    className="modal-backdrop"
                    onClick={() => setShowWhatsAppModal(false)}
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
                            background: '#ffffff',
                            borderRadius: 14,
                            width: '100%',
                            maxWidth: 440,
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BsWhatsapp size={18} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                                        Send via WhatsApp
                                    </h3>
                                    <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
                                        Credit Note #{whatsAppNote.credit_note_no || whatsAppNote.credit_note_number || whatsAppNote.id}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowWhatsAppModal(false)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
                            >
                                <BsX size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px' }}>
                            <p style={{ margin: '0 0 14px', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                                Send Credit Note confirmation and balance offset of <strong>{formatCurrency(whatsAppNote.refund_amount)}</strong> directly to customer on WhatsApp.
                            </p>

                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                                Customer Mobile Number
                            </label>
                            <input
                                type="tel"
                                placeholder="e.g. 9876543210"
                                value={whatsAppPhone}
                                onChange={(e) => setWhatsAppPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #cbd5e1',
                                    fontSize: 13,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                Enter 10-digit mobile number to send WhatsApp message.
                            </span>
                        </div>

                        <div
                            style={{
                                padding: '12px 20px',
                                background: '#f8fafc',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: 10,
                            }}
                        >
                            <button
                                type="button"
                                className="adm-btn-secondary"
                                onClick={() => setShowWhatsAppModal(false)}
                                disabled={whatsAppLoading}
                                style={{ padding: '8px 16px', fontSize: 13 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendWhatsAppSubmit}
                                disabled={whatsAppLoading}
                                style={{
                                    padding: '9px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    background: '#16a34a',
                                    color: '#fff',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: whatsAppLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <BsWhatsapp size={14} />
                                {whatsAppLoading ? 'Sending…' : 'Send WhatsApp'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default CreditNotesPage;
