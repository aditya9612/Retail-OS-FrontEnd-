import React, { useEffect, useState, useCallback } from "react";
import userService from "../../services/userService";
import { listStores } from "../../services/inventoryService";
import {
    BsPersonBadge, BsPlus, BsSearch, BsCheckCircleFill, BsXCircleFill,
    BsEnvelope, BsTelephone, BsShop, BsShieldLock, BsChevronLeft, BsChevronRight,
    BsArrowRepeat, BsExclamationTriangle
} from 'react-icons/bs';

const Employees = () => {
    const [users, setUsers] = useState([]);
    const [stores, setStores] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter & Pagination State
    const [selectedRole, setSelectedRole] = useState('1'); // Default: Admin (Role ID 1)
    const [selectedStore, setSelectedStore] = useState('1'); // Default: Store ID 1
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalUsers, setTotalUsers] = useState(0);
    const [roleName, setRoleName] = useState('admin');

    useEffect(() => {
        let isMounted = true;
        listStores().then(res => {
            if (!isMounted) return;
            const storeList = res?.data?.data || res?.data || (Array.isArray(res) ? res : []);
            if (Array.isArray(storeList) && storeList.length > 0) {
                setStores(storeList);
            }
        }).catch(() => {});
        return () => { isMounted = false; };
    }, []);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            let response;
            const params = {
                page,
                page_size: pageSize,
                ...(selectedStore ? { store_id: Number(selectedStore) } : {}),
            };

            if (selectedRole && selectedRole !== 'all') {
                response = await userService.getRoleUsers(Number(selectedRole), params);
            } else {
                response = await userService.getAll(params);
            }

            const resData = response?.data;
            // Correctly read response.users rather than assuming a direct array
            const userList = resData?.users || (Array.isArray(resData) ? resData : (resData?.items || []));
            setUsers(userList);

            if (resData?.total_users !== undefined) {
                setTotalUsers(resData.total_users);
            } else if (Array.isArray(resData)) {
                setTotalUsers(resData.length);
            } else if (resData?.total !== undefined) {
                setTotalUsers(resData.total);
            } else {
                setTotalUsers(userList.length);
            }

            if (resData?.role_name) {
                setRoleName(resData.role_name);
            }
        } catch (err) {
            console.error("Failed to load users:", err);
            const errMsg = err?.response?.data?.detail?.message ||
                err?.response?.data?.detail ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to load users";
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            setUsers([]);
            setTotalUsers(0);
        } finally {
            setLoading(false);
        }
    }, [selectedRole, selectedStore, page, pageSize]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
        setPage(1);
    };

    const handleStoreChange = (e) => {
        setSelectedStore(e.target.value);
        setPage(1);
    };

    const filteredUsers = users.filter(u =>
        (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.store_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.role?.name || roleName || '').toLowerCase().includes(search.toLowerCase())
    );

    const totalPages = Math.max(1, Math.ceil(totalUsers / pageSize));

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

            {error && (
                <div style={{
                    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px",
                    marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", color: "#991b1b", fontSize: 13
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BsExclamationTriangle />
                        <span><strong>API Error:</strong> {error}</span>
                    </div>
                    <button
                        onClick={loadUsers}
                        style={{
                            background: "#fff", border: "1px solid #f87171", borderRadius: 6,
                            padding: "4px 10px", fontSize: 12, fontWeight: 600, color: "#b91c1c", cursor: "pointer"
                        }}
                    >
                        Retry
                    </button>
                </div>
            )}

            <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{
                    padding: "16px 20px", borderBottom: "1px solid #e5e7eb",
                    display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", flex: 1 }}>
                        <div style={{ position: "relative", width: 260 }}>
                            <BsSearch style={{ position: "absolute", left: 12, top: 11, color: "#9ca3af" }} />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13 }}
                            />
                        </div>

                        {/* Role Selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <BsShieldLock style={{ color: "#6366f1" }} />
                            <select
                                value={selectedRole}
                                onChange={handleRoleChange}
                                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", color: "#374151", fontWeight: 500 }}
                            >
                                <option value="1">Role: Admin (ID: 1)</option>
                                <option value="2">Role: Store Manager (ID: 2)</option>
                                <option value="3">Role: Cashier (ID: 3)</option>
                                <option value="all">Role: All Roles</option>
                            </select>
                        </div>

                        {/* Store Selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <BsShop style={{ color: "#6366f1" }} />
                            <select
                                value={selectedStore}
                                onChange={handleStoreChange}
                                style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 13, background: "#fff", color: "#374151", fontWeight: 500 }}
                            >
                                {stores.length > 0 ? (
                                    stores.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.name || s.store_name || `Store #${s.id}`} (ID: {s.id})
                                        </option>
                                    ))
                                ) : (
                                    <>
                                        <option value="1">Store ID: 1 (Main Store)</option>
                                        <option value="2">Store ID: 2</option>
                                        <option value="3">Store ID: 3</option>
                                    </>
                                )}
                                <option value="">All Stores</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 13, color: "#6b7280" }}>
                            Total Users: <strong>{totalUsers}</strong>
                        </span>
                        <button
                            onClick={loadUsers}
                            title="Refresh"
                            style={{
                                background: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8,
                                padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", color: "#4b5563"
                            }}
                        >
                            <BsArrowRepeat className={loading ? "spin" : ""} />
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
                        <thead style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 600 }}>
                            <tr>
                                <th style={{ padding: "12px 18px" }}>ID</th>
                                <th style={{ padding: "12px 18px" }}>Staff Member</th>
                                <th style={{ padding: "12px 18px" }}>Email</th>
                                <th style={{ padding: "12px 18px" }}>Phone</th>
                                <th style={{ padding: "12px 18px" }}>Store</th>
                                <th style={{ padding: "12px 18px" }}>Assigned Role</th>
                                <th style={{ padding: "12px 18px" }}>Status</th>
                                <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: "36px 18px", textAlign: "center", color: "#6b7280" }}>
                                        <div style={{ display: "inline-block", width: 24, height: 24, border: "3px solid #e5e7eb", borderTopColor: "#6366f1", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                                        <p style={{ margin: "8px 0 0 0", fontSize: 13 }}>Loading users...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ padding: "36px 18px", textAlign: "center", color: "#6b7280" }}>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>No users found for the selected role and store.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
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
                                                <strong style={{ color: "#111827" }}>{user.full_name || 'N/A'}</strong>
                                            </div>
                                        </td>
                                        <td style={{ padding: "14px 18px", color: "#6b7280" }}>{user.email || 'N/A'}</td>
                                        <td style={{ padding: "14px 18px", color: "#6b7280" }}>{user.phone ? user.phone : 'N/A'}</td>
                                        <td style={{ padding: "14px 18px", color: "#4b5563", fontWeight: 500 }}>
                                            {user.store_name || (user.store_id ? `Store #${user.store_id}` : 'N/A')}
                                        </td>
                                        <td style={{ padding: "14px 18px" }}>
                                            <span style={{ background: "#eef2ff", color: "#4f46e5", padding: "3px 8px", borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                                                {roleName ? roleName.toUpperCase() : (user.role?.name || "Staff")}
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                    padding: "12px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb",
                    display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#6b7280"
                }}>
                    <div>
                        Showing <strong>{users.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to{" "}
                        <strong>{Math.min(page * pageSize, totalUsers)}</strong> of <strong>{totalUsers}</strong> users
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            style={{
                                display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                                border: "1px solid #d1d5db", borderRadius: 6, background: page <= 1 ? "#f3f4f6" : "#fff",
                                color: page <= 1 ? "#9ca3af" : "#374151", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12
                            }}
                        >
                            <BsChevronLeft size={12} /> Previous
                        </button>
                        <span style={{ padding: "0 6px", fontWeight: 600 }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || loading}
                            style={{
                                display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                                border: "1px solid #d1d5db", borderRadius: 6, background: page >= totalPages ? "#f3f4f6" : "#fff",
                                color: page >= totalPages ? "#9ca3af" : "#374151", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 12
                            }}
                        >
                            Next <BsChevronRight size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Employees;