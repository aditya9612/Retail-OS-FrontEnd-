import React, { useEffect, useState } from "react";
import userService from "../../services/userService";
import { BsPersonBadge, BsPlus, BsSearch, BsCheckCircleFill, BsXCircleFill, BsEnvelope, BsTelephone } from 'react-icons/bs';

const Employees = () => {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await userService.getAll({
                page: 1,
                page_size: 20,
            });
            if (response?.data) {
                setUsers(Array.isArray(response.data) ? response.data : (response.data.items || []));
            }
        } catch (error) {
            console.error("Failed to load users:", error);
            // Fallback demo users if API is disconnected
            setUsers([
                { id: 1, full_name: 'Rajesh Sharma', email: 'rajesh@retailos.in', phone: '+91 98110 22340', role: { name: 'Super Admin' }, is_active: true },
                { id: 2, full_name: 'Pooja Verma', email: 'pooja@retailos.in', phone: '+91 98220 33450', role: { name: 'Store Manager' }, is_active: true },
                { id: 3, full_name: 'Amit Kumar', email: 'amit@retailos.in', phone: '+91 98330 44560', role: { name: 'Cashier' }, is_active: true },
                { id: 4, full_name: 'Sunita Mehra', email: 'sunita@retailos.in', phone: '+91 98440 55670', role: { name: 'Inventory Clerk' }, is_active: true },
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ padding: "24px 28px", maxWidth: "1440px", margin: "0 auto" }}>
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: 20, marginBottom: 24, borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: 16
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, background: "#eef2ff", color: "#6366f1",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                    }}>
                        <BsPersonBadge />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Staff & Employees</h1>
                        <p style={{ fontSize: 13, color: "#6b7280", margin: "3px 0 0 0" }}>Manage cashiers, managers, role assignments, and system credentials</p>
                    </div>
                </div>

                <button style={{
                    background: "#6366f1", color: "#fff", border: "none", padding: "10px 18px",
                    borderRadius: 8, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                }}>
                    <BsPlus size={18} /> Add New Employee
                </button>
            </div>

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ position: "relative", width: 300 }}>
                        <BsSearch style={{ position: "absolute", left: 12, top: 11, color: "#9ca3af" }} />
                        <input
                            type="text"
                            placeholder="Search staff by name, email or role..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
                        />
                    </div>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>Total Staff: <strong>{users.length}</strong></span>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                    <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
                        <tr>
                            <th style={{ padding: "12px 18px" }}>ID</th>
                            <th style={{ padding: "12px 18px" }}>Staff Member</th>
                            <th style={{ padding: "12px 18px" }}>Email</th>
                            <th style={{ padding: "12px 18px" }}>Phone</th>
                            <th style={{ padding: "12px 18px" }}>Assigned Role</th>
                            <th style={{ padding: "12px 18px" }}>Status</th>
                            <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "14px 18px", color: "#9ca3af", fontWeight: 600 }}>#{user.id}</td>
                                <td style={{ padding: "14px 18px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: "50%", background: "#6366f1",
                                            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12
                                        }}>
                                            {(user.full_name || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <strong style={{ color: "#111827" }}>{user.full_name}</strong>
                                    </div>
                                </td>
                                <td style={{ padding: "14px 18px", color: "#6b7280" }}>{user.email || '—'}</td>
                                <td style={{ padding: "14px 18px", color: "#6b7280" }}>{user.phone || '—'}</td>
                                <td style={{ padding: "14px 18px" }}>
                                    <span style={{ background: "#eef2ff", color: "#4f46e5", padding: "3px 8px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                                        {user.role?.name || "Staff"}
                                    </span>
                                </td>
                                <td style={{ padding: "14px 18px" }}>
                                    <span style={{
                                        padding: "3px 10px", borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                                        background: user.is_active ? "#ecfdf5" : "#fef2f2",
                                        color: user.is_active ? "#059669" : "#dc2626"
                                    }}>
                                        {user.is_active ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                    <button style={{ background: "#f3f4f6", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Employees;