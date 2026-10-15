import React, { useState } from 'react';
import { BsGearFill, BsBuilding, BsCheckCircleFill, BsSave, BsShop } from 'react-icons/bs';

const Settings = () => {
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        businessName: 'RetailOS SuperMart Pvt Ltd',
        gstin: '07AAAAA0000A1Z5',
        pan: 'AAAAA0000A',
        storePhone: '+91 98765 43210',
        supportEmail: 'contact@retailos.in',
        address: 'Shop 104-106, Ground Floor, Connaught Place, Central Delhi',
        city: 'New Delhi',
        state: 'Delhi (07)',
        pincode: '110001',
        currency: 'INR (₹)',
        invoicePrefix: 'INV-2026-',
        thermalHeader: 'THANK YOU FOR SHOPPING WITH RETAILOS',
        thermalFooter: 'Goods once sold can be exchanged within 7 days with original invoice.',
    });

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = (e) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div style={{ padding: '24px 28px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingBottom: 20, marginBottom: 24, borderBottom: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, background: '#eef2ff', color: '#6366f1',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                    }}>
                        <BsGearFill />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: 0 }}>Business Settings</h1>
                        <p style={{ fontSize: 13, color: '#6b7280', margin: '3px 0 0 0' }}>Configure company profile, GST registration details, and receipt printing defaults</p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    style={{
                        background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px',
                        borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                    }}
                >
                    <BsSave size={16} /> Save Changes
                </button>
            </div>

            {saved && (
                <div style={{
                    background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0',
                    padding: '12px 16px', borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600
                }}>
                    <BsCheckCircleFill size={18} /> Business settings updated successfully!
                </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* General Profile */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Store Identity & Legal Entity</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Registered Business Name</label>
                            <input type="text" name="businessName" value={form.businessName} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>GSTIN (Goods & Service Tax Number)</label>
                            <input type="text" name="gstin" value={form.gstin} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, textTransform: 'uppercase', fontWeight: 600 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Support Contact Phone</label>
                            <input type="text" name="storePhone" value={form.storePhone} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Official Support Email</label>
                            <input type="email" name="supportEmail" value={form.supportEmail} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Store Physical Address</label>
                            <input type="text" name="address" value={form.address} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>State & State Code</label>
                            <input type="text" name="state" value={form.state} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Invoice Numbering Prefix</label>
                            <input type="text" name="invoicePrefix" value={form.invoicePrefix} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontWeight: 600 }} />
                        </div>
                    </div>
                </div>

                {/* Thermal Bill Receipt Customization */}
                <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Thermal Receipt Customization</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Receipt Header Message</label>
                            <input type="text" name="thermalHeader" value={form.thermalHeader} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Receipt Footer Exchange Policy Note</label>
                            <textarea rows="2" name="thermalFooter" value={form.thermalFooter} onChange={handleChange} style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default Settings;
