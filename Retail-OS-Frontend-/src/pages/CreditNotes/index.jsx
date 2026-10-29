import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'react-icons/bs';
import {
    getCreditNotes,
    createCreditNote,
    getCreditNoteById,
    getCreditNotePdf,
    downloadCreditNotePdf,
    previewCreditNotePdf,
    getCreditNoteThermal,
} from '../../services/creditNoteService.js';
import { searchInvoices, getStores } from '../../services/invoiceService.js';

/* ── Fallback Seed Credit Notes when server has no records ── */
const SEED_CREDIT_NOTES = [
    {
        id: 401,
        credit_note_no: 'CN-2026-00041',
        credit_note_number: 'CN-2026-00041',
        invoice_id: 1001,
        refund_amount: 1299.00,
        taxable_amount: 1100.85,
        cgst_amount: 99.08,
        sgst_amount: 99.07,
        igst_amount: 0,
        gst_rate: 18,
        reason: 'Customer returned size mismatch item at counter',
        status: 'active',
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
        id: 402,
        credit_note_no: 'CN-2026-00042',
        credit_note_number: 'CN-2026-00042',
        invoice_id: 1002,
        refund_amount: 890.00,
        taxable_amount: 754.24,
        cgst_amount: 67.88,
        sgst_amount: 67.88,
        igst_amount: 0,
        gst_rate: 18,
        reason: 'Defective fabric reported, counter credit issued',
        status: 'adjusted',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    },
    {
        id: 403,
        credit_note_no: 'CN-2026-00043',
        credit_note_number: 'CN-2026-00043',
        invoice_id: 1003,
        refund_amount: 2499.00,
        taxable_amount: 2117.80,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 381.20,
        gst_rate: 18,
        reason: 'Interstate shipment order cancellation',
        status: 'active',
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    }
];

export const CreditNotesPage = () => {
    const [searchParams] = useSearchParams();

    // ── State: Data & Loading ────────────────────────────────────────────────
    const [creditNotes, setCreditNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [dataSource, setDataSource] = useState('checking'); // 'api' | 'local'

    // ── State: Invoices mapping (to show Invoice # instead of just raw ID) ────
    const [invoicesMap, setInvoicesMap] = useState({});
    const [availableInvoices, setAvailableInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // ── State: Filters & Search ──────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [invoiceFilter, setInvoiceFilter] = useState('');
    const [appliedInvoiceFilter, setAppliedInvoiceFilter] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount_high, amount_low

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
            const data = await getCreditNotes(params);
            const notes = Array.isArray(data) ? data : (data?.data || []);

            // Backend API responded! Use real data exclusively, never mix seed data.
            setDataSource('api');

            // Filter if invoice filter is active
            const finalNotes = invoiceIdFilter 
                ? notes.filter(n => 
                    String(n.invoice_id).toLowerCase() === String(invoiceIdFilter).toLowerCase() ||
                    (invoicesMap[n.invoice_id]?.invoice_number && String(invoicesMap[n.invoice_id]?.invoice_number).toLowerCase() === String(invoiceIdFilter).toLowerCase())
                  )
                : notes;

            setCreditNotes(finalNotes);
        } catch (err) {
            console.warn('[CreditNotes] Server notice, falling back to local:', err.message);
            setDataSource('local');
            let localNotes = [];
            try {
                const stored = localStorage.getItem('retail_credit_notes');
                if (stored) localNotes = JSON.parse(stored) || [];
            } catch (_) {}

            const fallbackList = localNotes.length > 0 ? localNotes : SEED_CREDIT_NOTES;

            const finalNotes = invoiceIdFilter 
                ? fallbackList.filter(n => 
                    String(n.invoice_id).toLowerCase() === String(invoiceIdFilter).toLowerCase() ||
                    (invoicesMap[n.invoice_id]?.invoice_number && String(invoicesMap[n.invoice_id]?.invoice_number).toLowerCase() === String(invoiceIdFilter).toLowerCase())
                  )
                : fallbackList;

            setCreditNotes(finalNotes);
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
            } catch (_) {}

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
            } catch (_) {}

            const merged = [...invList];
            localInvoices.forEach(loc => {
                const exists = merged.some(m => String(m.id) === String(loc.id) || String(m.invoice_number) === String(loc.id));
                if (!exists) merged.push({
                    id: loc.id,
                    invoice_number: loc.id,
                    customer_name: loc.customer || 'Walk-in Customer',
                    total_amount: loc.total || 0,
                    created_at: loc.date,
                });
            });

            setAvailableInvoices(merged);

            // Build ID to Invoice lookup
            const map = {};
            merged.forEach((inv) => {
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
    }, [creditNotes, searchTerm, sortBy, invoicesMap]);

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
            showAlert(`Failed to load details: ${err.message}`, 'error');
            setShowDetailModal(false);
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
            } catch (_) {}

            if (backendSaved) {
                showAlert(`Credit Note ${cnNumber} generated successfully via Backend API!`, 'success');
            } else {
                showAlert(`Credit Note ${cnNumber} saved to Local Storage Buffer (Backend API unavailable/pending)`, 'warning');
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
                } else {
                    stored = [...SEED_CREDIT_NOTES];
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

        showAlert(`Credit Note #${creditNoteId} marked as Adjusted / Redeemed against sale (Saved locally)!`, 'success');
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
        <div style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', fontFamily: 'inherit' }}>
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

            {/* ── Page Header ─────────────────────────────────────────────────── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 24,
                    paddingBottom: 20,
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 12,
                            background: '#eef2ff',
                            color: '#6366f1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                        }}
                    >
                        <BsReceiptCutoff />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            Credit Notes
                            {dataSource === 'api' ? (
                                <span style={{ fontSize: 11, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                    API Connected
                                </span>
                            ) : (
                                <span style={{ fontSize: 11, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                                    Local Storage Buffer (Backend Pending)
                                </span>
                            )}
                        </h1>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0 0' }}>
                            Issue, track, and export GST credit notes and item reversal refund vouchers
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            fetchCreditNotesData(appliedInvoiceFilter);
                            loadInvoicesMetadata();
                            showAlert('Refreshing credit notes list...', 'info');
                        }}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 16px',
                            background: '#fff',
                            color: '#4b5563',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                        }}
                    >
                        <BsArrowClockwise size={15} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>

                    <button
                        onClick={handleOpenCreateModal}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 18px',
                            background: '#6366f1',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: 13,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <BsPlus size={18} /> Generate Credit Note
                    </button>
                </div>
            </div>

            {/* ── Dynamic KPI Stat Cards ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                <div
                    style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '18px 20px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        Total Credit Issued
                    </p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '8px 0 4px 0' }}>
                        {formatCurrency(kpiStats.totalCredited)}
                    </p>
                    <p style={{ fontSize: 12, color: '#10b981', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BsShieldCheck size={13} /> Across {kpiStats.totalNotes} backend record{kpiStats.totalNotes === 1 ? '' : 's'}
                    </p>
                </div>

                <div
                    style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '18px 20px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        Total Notes Count
                    </p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '8px 0 4px 0' }}>
                        {kpiStats.totalNotes} {kpiStats.totalNotes === 1 ? 'Note' : 'Notes'}
                    </p>
                    <p style={{ fontSize: 12, color: '#6366f1', margin: 0, fontWeight: 600 }}>
                        Live register sync
                    </p>
                </div>

                <div
                    style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '18px 20px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        Total GST Adjusted
                    </p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '8px 0 4px 0' }}>
                        {formatCurrency(kpiStats.totalGstAdjusted)}
                    </p>
                    <p style={{ fontSize: 12, color: '#0ea5e9', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <BsPercent size={13} /> Reconciled tax credit
                    </p>
                </div>

                <div
                    style={{
                        background: '#fff',
                        borderRadius: 12,
                        padding: '18px 20px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                >
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                        Average Credit Note
                    </p>
                    <p style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: '8px 0 4px 0' }}>
                        {formatCurrency(kpiStats.avgNoteValue)}
                    </p>
                    <p style={{ fontSize: 12, color: '#8b5cf6', margin: 0, fontWeight: 600 }}>
                        Per transaction average
                    </p>
                </div>
            </div>

            {/* ── Search & Filter Controls ─────────────────────────────────────── */}
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    padding: '14px 18px',
                    marginBottom: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
                    {/* Search Input */}
                    <div style={{ position: 'relative', width: '280px', minWidth: '220px' }}>
                        <BsSearch style={{ position: 'absolute', left: 12, top: 11, color: '#9ca3af' }} />
                        <input
                            type="text"
                            placeholder="Search by CN #, Invoice #..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 36px',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                fontSize: 13,
                                outline: 'none',
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{
                                    position: 'absolute',
                                    right: 10,
                                    top: 9,
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                }}
                            >
                                <BsX size={16} />
                            </button>
                        )}
                    </div>

                    {/* Backend Filter by Invoice ID */}
                    <form onSubmit={handleApplyInvoiceFilter} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                placeholder="Filter by Invoice ID..."
                                value={invoiceFilter}
                                onChange={(e) => setInvoiceFilter(e.target.value)}
                                min="1"
                                style={{
                                    width: '180px',
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: 8,
                                    fontSize: 13,
                                    outline: 'none',
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                padding: '8px 14px',
                                background: '#f3f4f6',
                                border: '1px solid #d1d5db',
                                borderRadius: 8,
                                fontSize: 12.5,
                                fontWeight: 600,
                                color: '#374151',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                        >
                            <BsFilter size={14} /> Filter
                        </button>
                        {appliedInvoiceFilter && (
                            <button
                                type="button"
                                onClick={handleClearInvoiceFilter}
                                style={{
                                    padding: '8px 10px',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#b91c1c',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear (Inv #{appliedInvoiceFilter})
                            </button>
                        )}
                    </form>
                </div>

                {/* Sort selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, color: '#6b7280', fontWeight: 500 }}>Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '7px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            fontSize: 12.5,
                            background: '#fff',
                            color: '#374151',
                            outline: 'none',
                        }}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="amount_high">Highest Amount</option>
                        <option value="amount_low">Lowest Amount</option>
                    </select>
                </div>
            </div>

            {/* ── Error Banner ─────────────────────────────────────────────────── */}
            {fetchError && (
                <div
                    style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: 10,
                        padding: '14px 18px',
                        marginBottom: 20,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        color: '#991b1b',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BsExclamationCircleFill size={18} />
                        <div>
                            <p style={{ fontWeight: 700, margin: 0, fontSize: 13.5 }}>Unable to load credit notes</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: 12.5 }}>{fetchError}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchCreditNotesData(appliedInvoiceFilter)}
                        style={{
                            padding: '6px 14px',
                            background: '#991b1b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* ── Credit Notes Table ───────────────────────────────────────────── */}
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}
            >
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
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        Credit Note Records{' '}
                        <span style={{ color: '#6b7280', fontWeight: 400 }}>
                            ({filteredCreditNotes.length} {filteredCreditNotes.length === 1 ? 'record' : 'records'})
                        </span>
                    </span>
                    {appliedInvoiceFilter && (
                        <span
                            style={{
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                padding: '3px 10px',
                                borderRadius: 12,
                                fontSize: 11.5,
                                fontWeight: 600,
                            }}
                        >
                            Filtered by Invoice #{appliedInvoiceFilter}
                        </span>
                    )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                        <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', fontWeight: 600 }}>
                            <tr>
                                <th style={{ padding: '12px 18px' }}>Credit Note #</th>
                                <th style={{ padding: '12px 18px' }}>Original Invoice</th>
                                <th style={{ padding: '12px 18px' }}>Refund Ref</th>
                                <th style={{ padding: '12px 18px' }}>Refund Amount</th>
                                <th style={{ padding: '12px 18px' }}>Tax Breakdown</th>
                                <th style={{ padding: '12px 18px' }}>Date Issued</th>
                                <th style={{ padding: '12px 18px' }}>Status</th>
                                <th style={{ padding: '12px 18px', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                            <BsArrowClockwise size={24} className="spin" style={{ color: '#6366f1' }} />
                                            <span>Loading backend credit notes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredCreditNotes.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '60px 20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                                            <div
                                                style={{
                                                    width: 54,
                                                    height: 54,
                                                    borderRadius: '50%',
                                                    background: '#f3f4f6',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#9ca3af',
                                                    fontSize: 24,
                                                }}
                                            >
                                                <BsReceiptCutoff />
                                            </div>
                                            <p style={{ fontWeight: 700, color: '#374151', margin: 0, fontSize: 15 }}>
                                                No Credit Notes Found
                                            </p>
                                            <p style={{ color: '#6b7280', fontSize: 13, margin: 0, maxWidth: 380 }}>
                                                {searchTerm || appliedInvoiceFilter
                                                    ? 'No credit notes match the specified search or filter criteria.'
                                                    : 'No credit notes have been generated for this store/tenant yet.'}
                                            </p>
                                            {appliedInvoiceFilter ? (
                                                <button
                                                    onClick={handleClearInvoiceFilter}
                                                    style={{
                                                        marginTop: 6,
                                                        padding: '7px 16px',
                                                        background: '#6366f1',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontSize: 12.5,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Clear Filter
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleOpenCreateModal}
                                                    style={{
                                                        marginTop: 6,
                                                        padding: '8px 18px',
                                                        background: '#6366f1',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: 8,
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <BsPlus size={16} /> Generate First Credit Note
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCreditNotes.map((cn) => {
                                    const linkedInvoice = invoicesMap[cn.invoice_id];
                                    const cgstNum = parseFloat(cn.cgst_amount) || 0;
                                    const sgstNum = parseFloat(cn.sgst_amount) || 0;
                                    const igstNum = parseFloat(cn.igst_amount) || 0;

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
                                            {/* Credit Note Number */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 700, color: '#4f46e5', letterSpacing: '-0.01em' }}>
                                                        {cn.credit_note_no}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                                                        ID: #{cn.id}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Original Invoice */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, color: '#1f2937' }}>
                                                        {linkedInvoice?.invoice_number ? linkedInvoice.invoice_number : `Invoice #${cn.invoice_id}`}
                                                    </span>
                                                    {linkedInvoice?.total_amount && (
                                                        <span style={{ fontSize: 11.5, color: '#6b7280' }}>
                                                            Total: {formatCurrency(linkedInvoice.total_amount)}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Refund Ref */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <span
                                                    style={{
                                                        background: '#f3f4f6',
                                                        color: '#374151',
                                                        padding: '3px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    REF #{cn.refund_id}
                                                </span>
                                            </td>

                                            {/* Refund Amount */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <span style={{ fontWeight: 800, color: '#111827', fontSize: 14 }}>
                                                    {formatCurrency(cn.refund_amount)}
                                                </span>
                                            </td>

                                            {/* Tax Breakdown */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11.5, color: '#4b5563' }}>
                                                    {igstNum > 0 ? (
                                                        <span>IGST: <strong style={{ color: '#111827' }}>{formatCurrency(igstNum)}</strong></span>
                                                    ) : (
                                                        <>
                                                            <span>CGST: <strong style={{ color: '#111827' }}>{formatCurrency(cgstNum)}</strong></span>
                                                            <span>SGST: <strong style={{ color: '#111827' }}>{formatCurrency(sgstNum)}</strong></span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Date Issued */}
                                            <td style={{ padding: '14px 18px', color: '#6b7280', fontSize: 12.5 }}>
                                                {formatDate(cn.created_at)}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '14px 18px' }}>
                                                <span
                                                    style={{
                                                        padding: '3px 10px',
                                                        borderRadius: 12,
                                                        fontSize: 11.5,
                                                        fontWeight: 700,
                                                        background: '#ecfdf5',
                                                        color: '#059669',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4,
                                                    }}
                                                >
                                                    <BsCheckCircleFill size={10} /> Active
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                    <button
                                                        onClick={() => handleViewDetails(cn.id)}
                                                        title="View Credit Note Details"
                                                        style={{
                                                            background: '#f9fafb',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: 6,
                                                            padding: '5px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#374151',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <BsEye size={13} /> View
                                                    </button>

                                                    <button
                                                        onClick={() => handlePreviewPdf(cn.id, cn.credit_note_no)}
                                                        title="Preview Branded PDF"
                                                        style={{
                                                            background: '#eff6ff',
                                                            border: '1px solid #bfdbfe',
                                                            borderRadius: 6,
                                                            padding: '5px 10px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#2563eb',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <BsFileEarmarkPdf size={13} /> Preview
                                                    </button>

                                                    <button
                                                        onClick={() => handleDownloadPdf(cn.id)}
                                                        title="Download Credit Note PDF"
                                                        style={{
                                                            background: '#f3f4f6',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: 6,
                                                            padding: '5px 8px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#4b5563',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <BsDownload size={13} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleThermalSlip(cn.id)}
                                                        title="Preview 80mm ESC/POS Thermal Slip"
                                                        style={{
                                                            background: '#f3f4f6',
                                                            border: '1px solid #d1d5db',
                                                            borderRadius: 6,
                                                            padding: '5px 8px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: '#4b5563',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <BsPrinter size={13} />
                                                    </button>

                                                    <button
                                                        onClick={() => {
                                                            if (cn.status !== 'adjusted') {
                                                                handleRedeemCreditNote(cn.id);
                                                            }
                                                        }}
                                                        disabled={cn.status === 'adjusted'}
                                                        title={cn.status === 'adjusted' ? 'Credit Note already adjusted against counter sale' : 'Mark as Redeemed / Adjusted against Counter Sale'}
                                                        style={{
                                                            background: cn.status === 'adjusted' ? '#f3f4f6' : '#ecfdf5',
                                                            border: '1px solid ' + (cn.status === 'adjusted' ? '#d1d5db' : '#10b981'),
                                                            borderRadius: 6,
                                                            padding: '5px 8px',
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: cn.status === 'adjusted' ? '#6b7280' : '#059669',
                                                            cursor: cn.status === 'adjusted' ? 'not-allowed' : 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                        }}
                                                    >
                                                        <BsCheck2Circle size={12} /> {cn.status === 'adjusted' ? 'Adjusted' : 'Redeem'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
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
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '18px 24px',
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
                        <form onSubmit={handleCreateSubmit} style={{ padding: '22px 24px' }}>
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
                                    Generating this Credit Note executes <code>POST /api/v1/credit-notes</code>, creating an official GST credit document and auto-generating an authorized refund record in the ledger.
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
                            maxWidth: 580,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Detail Header */}
                        <div
                            style={{
                                padding: '18px 24px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: '#fafafa',
                            }}
                        >
                            <div>
                                <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0, color: '#111827' }}>
                                    Credit Note Details
                                </h2>
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                    Fetched via GET /api/v1/credit-notes/{selectedCreditNote?.id || ''}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowDetailModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                <BsX size={22} />
                            </button>
                        </div>

                        {/* Detail Body */}
                        <div style={{ padding: '24px' }}>
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
                                            padding: '16px',
                                            marginBottom: 20,
                                            border: '1px solid #e2e8f0',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                                                Credit Note Number
                                            </span>
                                            <p style={{ fontSize: 18, fontWeight: 800, color: '#4f46e5', margin: '4px 0 0 0' }}>
                                                {selectedCreditNote.credit_note_no}
                                            </p>
                                        </div>
                                        <span
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: 12,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                background: '#ecfdf5',
                                                color: '#059669',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 4,
                                            }}
                                        >
                                            <BsCheckCircleFill size={11} /> Reconciled
                                        </span>
                                    </div>

                                    {/* Core Fields Grid */}
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, 1fr)',
                                            gap: 14,
                                            marginBottom: 20,
                                        }}
                                    >
                                        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Refund Amount</span>
                                            <p style={{ fontSize: 17, fontWeight: 800, color: '#111827', margin: '4px 0 0 0' }}>
                                                {formatCurrency(selectedCreditNote.refund_amount)}
                                            </p>
                                        </div>

                                        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Original Invoice</span>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>
                                                {invoicesMap[selectedCreditNote.invoice_id]?.invoice_number || `Invoice #${selectedCreditNote.invoice_id}`}
                                            </p>
                                        </div>

                                        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Linked Refund ID</span>
                                            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '4px 0 0 0' }}>
                                                REF #{selectedCreditNote.refund_id}
                                            </p>
                                        </div>

                                        <div style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                                            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>Date Created</span>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: '4px 0 0 0' }}>
                                                {formatDate(selectedCreditNote.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Statutory Tax Breakdown */}
                                    <div style={{ marginBottom: 20 }}>
                                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: '0 0 10px 0' }}>
                                            Statutory Tax Adjustments
                                        </h4>
                                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                                                <span style={{ color: '#4b5563' }}>CGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.cgst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                                                <span style={{ color: '#4b5563' }}>SGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.sgst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                                                <span style={{ color: '#4b5563' }}>IGST Amount</span>
                                                <strong style={{ color: '#111827' }}>{formatCurrency(selectedCreditNote.igst_amount)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', fontWeight: 700, fontSize: 13.5 }}>
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

                                    {/* Modal Actions */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                                        <button
                                            type="button"
                                            onClick={() => handlePreviewPdf(selectedCreditNote.id, selectedCreditNote.credit_note_no)}
                                            style={{
                                                padding: '9px 16px',
                                                background: '#eff6ff',
                                                border: '1px solid #bfdbfe',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: '#2563eb',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <BsFileEarmarkPdf size={15} /> Preview PDF
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDownloadPdf(selectedCreditNote.id)}
                                            style={{
                                                padding: '9px 16px',
                                                background: '#4f46e5',
                                                border: 'none',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: '#fff',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                            }}
                                        >
                                            <BsDownload size={14} /> Download PDF
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
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
                                        Streaming from GET /api/v1/credit-notes/{pdfPreview.creditNoteId}/pdf?mode=preview
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
