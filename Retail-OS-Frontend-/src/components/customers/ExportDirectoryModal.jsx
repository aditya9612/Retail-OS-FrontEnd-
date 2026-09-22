import React, { useState, useMemo } from 'react';
import { BsFileEarmarkPdf, BsFileEarmarkExcel, BsDownload, BsX, BsCheckCircle, BsExclamationTriangle } from 'react-icons/bs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { exportCustomerDirectory } from '../../services/customer';


const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1100,
    background: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
};

const modalBoxStyle = {
    background: '#FFFFFF',
    width: '100%',
    maxWidth: '480px',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.2), 0 0 1px rgba(15, 23, 42, 0.15)',
    border: '1px solid #E2E8F0',
    position: 'relative',
};

const ExportDirectoryModal = ({ isOpen, onClose, customers = [] }) => {
    const [status, setStatus] = useState('All');
    const [format, setFormat] = useState('pdf');
    const [exporting, setExporting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const filteredCustomers = useMemo(() => {
        if (!customers || customers.length === 0) return [];
        if (status === 'All') return customers;
        if (status === 'Active') {
            return customers.filter(c => c.status === 'Active' || c.status?.toLowerCase() === 'active');
        }
        if (status === 'Inactive') {
            return customers.filter(c => c.status === 'Inactive' || c.status === 'Blocked' || c.status?.toLowerCase() !== 'active');
        }
        return customers;
    }, [customers, status]);

    if (!isOpen) return null;

    const generatePdfExport = (data, filename, filterStatusLabel) => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 297, 16, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.text('Retail OS — Customer Directory Export', 14, 11);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const subtext = 'Status Filter: ' + filterStatusLabel + '   |   Total Records: ' + data.length + '   |   Export Date: ' + new Date().toLocaleDateString('en-IN');
        doc.text(subtext, 14, 23);

        const headers = [['#', 'Customer ID', 'Name', 'Email', 'Phone', 'City', 'Segment', 'Status', 'Orders', 'Total Spent']];
        const rows = data.map((c, i) => [
            i + 1,
            c.id || '—',
            c.name || '—',
            c.email || '—',
            c.phone || '—',
            c.city || '—',
            c.type || 'Regular',
            c.status || 'Active',
            c.orders ? String(c.orders) : '0',
            'Rs. ' + Number(c.totalSpent || 0).toLocaleString('en-IN'),
        ]);

        autoTable(doc, {
            startY: 27,
            head: headers,
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                halign: 'left',
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [30, 41, 59],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            styles: {
                cellPadding: 3,
                overflow: 'linebreak',
            },
        });

        doc.save(filename + '.pdf');
    };

    const generateExcelExport = (data, filename) => {
        const rows = data.map((c, i) => ({
            'S.No': i + 1,
            'Customer ID': c.id || '—',
            'Customer Name': c.name || '—',
            'Email Address': c.email || '—',
            'Phone Number': c.phone || '—',
            'City': c.city || '—',
            'Segment': c.type || 'Regular',
            'Status': c.status || 'Active',
            'Total Orders': c.orders || 0,
            'Total Spent (INR)': c.totalSpent || 0,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Directory');

        if (rows.length > 0) {
            const colWidths = Object.keys(rows[0]).map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...rows.map(r => String(r[key] || '').length)
                );
                return { wch: Math.min(Math.max(maxLen + 3, 10), 40) };
            });
            worksheet['!cols'] = colWidths;
        }

        XLSX.writeFile(workbook, filename + '.xlsx');
    };

    const handleExport = async (e) => {
        e.preventDefault();

        if (!status || !format) {
            setErrorMessage('Please select both Status and Export Format.');
            return;
        }

        setExporting(true);
        setErrorMessage('');
        setSuccessMessage('');

        const statusParam = status === 'All' ? 'all' : status.toLowerCase();
        const formatParam = format.toLowerCase();

        try {
            const response = await exportCustomerDirectory({ status: statusParam, format: formatParam });

            // Extract blob data
            const blob = new Blob([response.data], {
                type: formatParam === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Check if server returned a JSON error response disguised as a Blob
            if (response.data?.type === 'application/json') {
                try {
                    const text = await response.data.text();
                    const json = JSON.parse(text);
                    if (json && json.detail) {
                        const msg = typeof json.detail === 'string' ? json.detail : (json.detail.message || JSON.stringify(json.detail));
                        throw new Error(msg);
                    }
                } catch (parseErr) {
                    if (parseErr.message && !parseErr.message.includes('Unexpected token')) {
                        throw parseErr;
                    }
                }
            }

            // Determine filename from content-disposition header if present
            let filename = `Customer_Directory_${status}_${new Date().toISOString().slice(0, 10)}.${formatParam === 'excel' ? 'xlsx' : 'pdf'}`;
            const contentDisposition = response.headers?.['content-disposition'];
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/);
                if (match && match[1]) {
                    filename = match[1];
                }
            }

            // Download file
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);

            setSuccessMessage(`Exported directory as ${format.toUpperCase()} successfully!`);

            setTimeout(() => {
                setSuccessMessage('');
                onClose();
            }, 1200);
        } catch (err) {
            console.warn('API export directory call failed or returned error, attempting fallback:', err);

            // Client-side fallback if API returns error or is unavailable
            try {
                if (filteredCustomers.length === 0) {
                    const statusName = status !== 'All' ? status.toLowerCase() : '';
                    setErrorMessage(err.message || `No ${statusName} customers found to export.`);
                    setExporting(false);
                    return;
                }

                const timestamp = new Date().toISOString().slice(0, 10);
                const filename = 'Customer_Directory_' + status + '_' + timestamp;

                if (format === 'pdf') {
                    generatePdfExport(filteredCustomers, filename, status);
                } else if (format === 'excel') {
                    generateExcelExport(filteredCustomers, filename);
                }

                setSuccessMessage(`Exported ${filteredCustomers.length} record(s) as ${format.toUpperCase()} successfully!`);

                setTimeout(() => {
                    setSuccessMessage('');
                    onClose();
                }, 1200);
            } catch (fallbackErr) {
                console.error('Fallback Export Error:', fallbackErr);
                setErrorMessage(err.message || 'Failed to generate export file. Please try again.');
            }
        } finally {
            setExporting(false);
        }
    };

    const handleContainerClick = (e) => {
        e.stopPropagation();
    };

    const isButtonDisabled = !status || !format || exporting;

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalBoxStyle} onClick={handleContainerClick}>
                {/* Modal Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BsDownload size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Export Directory</h3>
                            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>
                                Filter customers and download the directory file.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close modal"
                        style={{
                            border: 'none',
                            background: '#F1F5F9',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#64748B',
                        }}
                    >
                        <BsX size={20} />
                    </button>
                </div>

                {/* Notifications Banners */}
                {successMessage && (
                    <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontSize: '12.5px', fontWeight: 600 }}>
                        <BsCheckCircle size={15} style={{ flexShrink: 0 }} />
                        <span>{successMessage}</span>
                    </div>
                )}

                {errorMessage && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '12.5px', fontWeight: 600 }}>
                        <BsExclamationTriangle size={15} style={{ flexShrink: 0 }} />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Export Form */}
                <form onSubmit={handleExport}>
                    {/* 1. Status Select Field */}
                    <div style={{ marginBottom: '18px' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            1. Select Customer Status
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            style={{
                                width: '100%',
                                height: '42px',
                                padding: '0 12px',
                                borderRadius: '10px',
                                border: '1.5px solid #CBD5E1',
                                background: '#F8FAFC',
                                fontSize: '13.5px',
                                fontWeight: 600,
                                color: '#0F172A',
                                outline: 'none',
                                cursor: 'pointer',
                            }}
                        >
                            <option value="All">All Customers ({customers.length})</option>
                            <option value="Active">Active Customers Only</option>
                            <option value="Inactive">Inactive Customers Only</option>
                        </select>
                    </div>

                    {/* 2. Format Select Field */}
                    <div style={{ marginBottom: '22px' }}>
                        <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                            2. Select Export Format
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {/* PDF Format Option */}
                            <div
                                onClick={() => setFormat('pdf')}
                                style={{
                                    border: format === 'pdf' ? '2px solid #2563EB' : '2px solid #E2E8F0',
                                    background: format === 'pdf' ? '#EFF6FF' : '#FFFFFF',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: format === 'pdf' ? '#DBEAFE' : '#F1F5F9', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BsFileEarmarkPdf size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: format === 'pdf' ? '#1D4ED8' : '#0F172A' }}>PDF Document</div>
                                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>.pdf format</div>
                                </div>
                            </div>

                            {/* Excel Format Option */}
                            <div
                                onClick={() => setFormat('excel')}
                                style={{
                                    border: format === 'excel' ? '2px solid #2563EB' : '2px solid #E2E8F0',
                                    background: format === 'excel' ? '#EFF6FF' : '#FFFFFF',
                                    borderRadius: '12px',
                                    padding: '12px 14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: format === 'excel' ? '#DBEAFE' : '#F1F5F9', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BsFileEarmarkExcel size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: format === 'excel' ? '#1D4ED8' : '#0F172A' }}>Excel Sheet</div>
                                    <div style={{ fontSize: '10.5px', color: '#64748B' }}>.xlsx format</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary pill */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <span style={{ color: '#64748B', fontWeight: 500 }}>Records to export:</span>
                        <span style={{ fontWeight: 800, color: '#0F172A' }}>{filteredCustomers.length} customer(s)</span>
                    </div>

                    {/* Footer Buttons */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                height: '42px',
                                padding: '0 18px',
                                borderRadius: '10px',
                                border: '1px solid #CBD5E1',
                                background: '#FFFFFF',
                                color: '#475569',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isButtonDisabled}
                            style={{
                                height: '42px',
                                padding: '0 20px',
                                borderRadius: '10px',
                                border: 'none',
                                background: isButtonDisabled
                                    ? '#94A3B8'
                                    : 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)',
                                color: '#FFFFFF',
                                fontSize: '13.5px',
                                fontWeight: 700,
                                cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: isButtonDisabled ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.25)',
                                opacity: isButtonDisabled ? 0.7 : 1,
                            }}
                        >
                            <BsDownload size={15} />
                            {exporting ? 'Generating File...' : 'Export Directory'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ExportDirectoryModal;
