import React, { useState } from 'react';

const initialForm = {
    customerName: '',
    mobileNumber: '',
    productName: '',
    quantity: '',
    price: '',
    paymentMethod: '',
    notes: '',
};

const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: '#f8fafc',
    borderRadius: 12,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    outline: 'none',
};

const NewOrderForm = ({ onClose }) => {
  const [form, setForm] = useState(
    product
        ? {
            ...EMPTY_FORM,
            ...product,
            brand: product.brand || '',
            mrp: product.mrp ?? '',
            sellingPrice: product.price ?? '',
        }
        : { ...EMPTY_FORM }
);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
         console.log("Submit button clicked");
        const { customerName, mobileNumber, productName, quantity, price, paymentMethod } = form;

        if (!customerName.trim()) {
            alert('Customer Name is required');
            return;
        }
        if (!mobileNumber.trim()) {
            alert('Mobile Number is required');
            return;
        }
        if (!productName.trim()) {
            alert('Product Name is required');
            return;
        }
        if (!quantity || Number(quantity) <= 0) {
            alert('Quantity must be greater than 0');
            return;
        }
        if (!price || Number(price) <= 0) {
            alert('Price must be greater than 0');
            return;
        }
        if (!paymentMethod) {
            alert('Payment Method is required');
            return;
        }

        const formData = {
            customerName: customerName.trim(),
            mobileNumber: mobileNumber.trim(),
            productName: productName.trim(),
            quantity: Number(quantity),
            price: Number(price),
            paymentMethod,
            notes: form.notes.trim(),
        };

        console.log(formData);
        alert('Order created successfully!');
        setForm(initialForm);
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 24,
                    padding: 32,
                    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>
                    New Order
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <input
                        type="text"
                        name="customerName"
                        placeholder="Customer Name *"
                        value={form.customerName}
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        type="text"
                        name="mobileNumber"
                        placeholder="Mobile Number *"
                        value={form.mobileNumber}
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        type="text"
                        name="productName"
                        placeholder="Product Name *"
                        value={form.productName}
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        type="number"
                        name="quantity"
                        placeholder="Quantity *"
                        min="1"
                        value={form.quantity}
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <input
                        type="number"
                        name="price"
                        placeholder="Price *"
                        min="0.01"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        style={inputStyle}
                    />

                    <select
                        name="paymentMethod"
                        value={form.paymentMethod}
                        onChange={handleChange}
                        style={inputStyle}
                    >
                        <option value="">Payment Method *</option>
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                    </select>

                    <textarea
                        name="notes"
                        placeholder="Notes (optional)"
                        value={form.notes}
                        onChange={handleChange}
                        rows={3}
                        style={{ ...inputStyle, resize: 'vertical' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="adm-btn-primary"
                        style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
                    >
                        Submit Order
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="adm-btn-secondary"
                        style={{ flex: 1, justifyContent: 'center', padding: '12px 0' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewOrderForm;