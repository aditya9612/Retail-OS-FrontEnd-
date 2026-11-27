import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useNavigate } from 'react-router-dom';

import {

    BsPeopleFill,

    BsPlus,

    BsSearch,

    BsArrowRepeat,

    BsShop,

    BsEnvelope,

    BsTelephone,

    BsCheckCircleFill,

    BsXCircleFill,

    BsPencilSquare,

    BsTrash,

    BsEye,

    BsEyeSlash,

    BsPersonBadge,

    BsExclamationTriangle,

    BsX,

    BsChevronLeft,

    BsChevronRight,

    BsShieldCheck

} from 'react-icons/bs';



import userService from '../../services/userService';

import storeService from '../../services/storeService';

import notificationService from '../../utils/notificationService';

import { PageContainer, PageHeader, KpiGrid, KpiCard } from '../../components/Common/PageComponents';



import '../../components/Categories/CategoryCards.css';

import '../../components/Common/PageComponents.css';

import './Employees.css';



const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/;

const FULL_NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[ .'-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$/;



const getInitials = (name) => {

    if (!name) return 'U';

    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2) {

        return (parts[0][0] + parts[1][0]).toUpperCase();

    }

    return name.slice(0, 2).toUpperCase();

};



const getRoleClass = (roleName) => {

    if (!roleName) return 'default';

    const lower = roleName.toLowerCase();

    if (lower.includes('admin') || lower.includes('owner')) return 'admin';

    if (lower.includes('manager')) return 'manager';

    if (lower.includes('cashier')) return 'cashier';

    if (lower.includes('accountant')) return 'accountant';

    return 'staff';

};



const formatRoleLabel = (roleName) => {

    if (!roleName) return 'Staff';

    return roleName

        .split(/[_\s]+/)

        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

        .join(' ');

};



const Employees = () => {

    const navigate = useNavigate();



    // ── Primary Data State ──

    const [users, setUsers] = useState([]);

    const [roles, setRoles] = useState([]);

    const [stores, setStores] = useState([]);



    // ── KPI Summary State (Accurate Backend Record Counts) ──

    const [kpiStats, setKpiStats] = useState({

        total: 0,

        active: 0,

        inactive: 0,

        totalRoles: 0

    });



    const [loading, setLoading] = useState(true);

    const [actionLoading, setActionLoading] = useState(false);

    const [error, setError] = useState(null);



    // ── Filters & Search State ──

    const [search, setSearch] = useState('');

    const [roleFilter, setRoleFilter] = useState('all');

    const [storeFilter, setStoreFilter] = useState('all');

    const [statusFilter, setStatusFilter] = useState('all');



    // ── Pagination State ──

    const [page, setPage] = useState(1);

    const [pageSize, setPageSize] = useState(10);



    // ── Modal States ──

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);



    const [editingUser, setEditingUser] = useState(null);

    const [deletingUser, setDeletingUser] = useState(null);



    // Password visibility toggles

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [showEditPassword, setShowEditPassword] = useState(false);

    const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);



    const [modalError, setModalError] = useState(null);

    const [fieldErrors, setFieldErrors] = useState({});



    // ── Form Initial States ──

    const initialAddForm = {

        full_name: '',

        email: '',

        phone: '',

        password: '',

        confirm_password: '',

        role_id: '',

        store_id: '',

        is_active: true,

        pan_number: '',

        addhar_number: ''

    };

    const [addForm, setAddForm] = useState(initialAddForm);



    const initialEditForm = {

        id: null,

        full_name: '',

        email: '',

        phone: '',

        role_id: '',

        store_id: '',

        is_active: true,

        password: '',

        confirm_password: '',

        pan_number: '',

        addhar_number: ''

    };

    const [editForm, setEditForm] = useState(initialEditForm);



    // ── Stores & Roles Lookup Maps ──

    const storeMap = useMemo(() => {

        const map = {};

        stores.forEach(s => {

            if (s && s.id !== undefined) {

                map[s.id] = s;

            }

        });

        return map;

    }, [stores]);



    const roleMap = useMemo(() => {

        const map = {};

        roles.forEach(r => {

            if (r && r.id !== undefined) {

                map[r.id] = r;

            }

        });

        return map;

    }, [roles]);



    // ── Load All Data From Real Backend & Compute KPIs ──

    const loadData = useCallback(async () => {

        setLoading(true);

        setError(null);

        try {

            // Fetch users, roles, stores, and store-summary in parallel

            const [usersRes, rolesRes, storesRes, byStoreRes] = await Promise.allSettled([

                userService.listUsers({ include_inactive: true, page: 1, page_size: 100 }),

                userService.getRoles(),

                storeService.listStores({ include_inactive: true }),

                userService.getUsersByStore({ include_unassigned: true })

            ]);



            // 1. Process Users

            let userList = [];

            if (usersRes.status === 'fulfilled') {

                const raw = usersRes.value;

                const resData = raw?.data || raw;

                userList = Array.isArray(resData)

                    ? resData

                    : (Array.isArray(resData?.users)

                        ? resData.users

                        : (Array.isArray(resData?.items) ? resData.items : (Array.isArray(raw) ? raw : [])));

            }

            setUsers(userList);



            // 2. Process Roles

            let roleList = [];

            if (rolesRes.status === 'fulfilled') {

                const raw = rolesRes.value;

                roleList = Array.isArray(raw?.data)

                    ? raw.data

                    : (Array.isArray(raw?.data?.data) ? raw.data.data : (Array.isArray(raw) ? raw : []));

            }

            setRoles(roleList);



            // 3. Process Stores

            let storeList = [];

            if (storesRes.status === 'fulfilled') {

                const raw = storesRes.value;

                storeList = Array.isArray(raw?.data)

                    ? raw.data

                    : (Array.isArray(raw) ? raw : []);

            }

            setStores(storeList);



            // 4. Compute KPI Metrics accurately from backend records

            let totalEmployees = userList.length;

            let activeCount = userList.filter(u => u.is_active).length;

            let inactiveCount = userList.filter(u => !u.is_active).length;



            if (byStoreRes.status === 'fulfilled' && byStoreRes.value?.data) {

                const bData = byStoreRes.value.data;

                if (typeof bData.total_users === 'number' && bData.total_users >= totalEmployees) {

                    totalEmployees = bData.total_users;

                }

                if (Array.isArray(bData.stores)) {

                    let aggregated = [];

                    bData.stores.forEach(st => {

                        if (Array.isArray(st.users)) {

                            aggregated.push(...st.users);

                        }

                    });

                    if (aggregated.length >= userList.length) {

                        activeCount = aggregated.filter(u => u.is_active).length;

                        inactiveCount = aggregated.filter(u => !u.is_active).length;

                    }

                }

            }



            setKpiStats({

                total: totalEmployees,

                active: activeCount,

                inactive: inactiveCount,

                totalRoles: roleList.length

            });

        } catch (err) {

            console.error("Failed to load staff data:", err);

            const msg = err.response?.data?.detail || err.message || "Failed to load employee records from backend.";

            setError(msg);

            notificationService.error(msg, "Data Load Failed");

        } finally {

            setLoading(false);

        }

    }, []);



    useEffect(() => {

        loadData();

    }, [loadData]);



    // ── Filtered Users Pipeline ──

    const filteredUsers = useMemo(() => {

        return users.filter(user => {

            // 1. Search Filter (name, email, phone)

            if (search.trim()) {

                const q = search.trim().toLowerCase();

                const nameMatch = (user.full_name || '').toLowerCase().includes(q);

                const emailMatch = (user.email || '').toLowerCase().includes(q);

                const phoneMatch = (user.phone || '').toLowerCase().includes(q);

                if (!nameMatch && !emailMatch && !phoneMatch) {

                    return false;

                }

            }



            // 2. Role Filter

            if (roleFilter !== 'all') {

                const targetRoleId = Number(roleFilter);

                if (user.role_id !== targetRoleId && user.role?.id !== targetRoleId) {

                    return false;

                }

            }



            // 3. Store Filter

            if (storeFilter !== 'all') {

                if (storeFilter === 'unassigned') {

                    if (user.store_id !== null && user.store_id !== undefined) return false;

                } else {

                    const targetStoreId = Number(storeFilter);

                    if (user.store_id !== targetStoreId) return false;

                }

            }



            // 4. Status Filter

            if (statusFilter !== 'all') {

                if (statusFilter === 'active' && !user.is_active) return false;

                if (statusFilter === 'inactive' && user.is_active) return false;

            }



            return true;

        });

    }, [users, search, roleFilter, storeFilter, statusFilter]);



    // ── Pagination Calculation ──

    const totalItems = filteredUsers.length;

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const currentPage = Math.min(page, totalPages);



    const paginatedUsers = useMemo(() => {

        const start = (currentPage - 1) * pageSize;

        return filteredUsers.slice(start, start + pageSize);

    }, [filteredUsers, currentPage, pageSize]);



    // Reset to page 1 on filter change

    useEffect(() => {

        setPage(1);

    }, [search, roleFilter, storeFilter, statusFilter, pageSize]);



    // ── Real-Time Input Change Handlers with Validation Clear ──

    const handleAddChange = (field, value) => {

        setAddForm(prev => ({ ...prev, [field]: value }));

        if (fieldErrors[field]) {

            setFieldErrors(prev => {

                const updated = { ...prev };

                delete updated[field];

                return updated;

            });

        }

        if (field === 'password' || field === 'confirm_password') {

            const pwd = field === 'password' ? value : addForm.password;

            const cpwd = field === 'confirm_password' ? value : addForm.confirm_password;

            if (fieldErrors.confirm_password && pwd && cpwd && pwd === cpwd) {

                setFieldErrors(prev => {

                    const updated = { ...prev };

                    delete updated.confirm_password;

                    return updated;

                });

            }

        }

    };



    const handleEditChange = (field, value) => {

        setEditForm(prev => ({ ...prev, [field]: value }));

        if (fieldErrors[field]) {

            setFieldErrors(prev => {

                const updated = { ...prev };

                delete updated[field];

                return updated;

            });

        }

        if (field === 'password' || field === 'confirm_password') {

            const pwd = field === 'password' ? value : editForm.password;

            const cpwd = field === 'confirm_password' ? value : editForm.confirm_password;

            if (fieldErrors.confirm_password && pwd && cpwd && pwd === cpwd) {

                setFieldErrors(prev => {

                    const updated = { ...prev };

                    delete updated.confirm_password;

                    return updated;

                });

            }

        }

    };



    // ── Mandatory Form Validation Helpers ──

    const validateAddForm = () => {

        const errors = {};

        const nameTrimmed = (addForm.full_name || '').trim();

        if (!nameTrimmed) {

            errors.full_name = "Full name is required.";

        } else if (nameTrimmed.length < 2) {

            errors.full_name = "Full name must be at least 2 characters.";

        } else if (nameTrimmed.length > 100) {

            errors.full_name = "Full name cannot exceed 100 characters.";

        } else if (!FULL_NAME_REGEX.test(nameTrimmed) || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(nameTrimmed)) {

            errors.full_name = "Full name may only contain letters, spaces, dots, hyphens, and apostrophes.";

        }



        const emailTrimmed = (addForm.email || '').trim().toLowerCase();

        if (!emailTrimmed) {

            errors.email = "Email address is required.";

        } else if (!EMAIL_REGEX.test(emailTrimmed)) {

            errors.email = "Please enter a valid email address (e.g. name@domain.com).";

        }



        const rawPhone = (addForm.phone || '').trim().replace(/\s+/g, '');

        const cleanPhone = rawPhone.replace(/^(\+91)/, '');

        if (!cleanPhone) {

            errors.phone = "Mobile number is required.";

        } else if (!/^\d+$/.test(cleanPhone)) {

            errors.phone = "Mobile number must contain digits only.";

        } else if (!INDIAN_PHONE_REGEX.test(cleanPhone)) {

            errors.phone = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";

        }



        if (!addForm.password) {

            errors.password = "Password is required.";

        } else {

            if (addForm.password.length < 8) {

                errors.password = "Password must be at least 8 characters.";

            } else if (addForm.password.length > 100) {

                errors.password = "Password cannot exceed 100 characters.";

            } else if (!/[A-Z]/.test(addForm.password)) {

                errors.password = "Must contain at least one uppercase letter (A-Z).";

            } else if (!/[a-z]/.test(addForm.password)) {

                errors.password = "Must contain at least one lowercase letter (a-z).";

            } else if (!/[0-9]/.test(addForm.password)) {

                errors.password = "Must contain at least one number (0-9).";

            } else if (!SPECIAL_CHARS.test(addForm.password)) {

                errors.password = "Must contain at least one special character (!@#$%^&*...).";

            }

        }



        if (!addForm.confirm_password) {

            errors.confirm_password = "Confirm password is required.";

        } else if (addForm.password !== addForm.confirm_password) {

            errors.confirm_password = "Passwords do not match.";

        }



        if (!addForm.store_id) {

            errors.store_id = "Please select a store assignment.";

        }



        if (!addForm.role_id) {

            errors.role_id = "Please select an assigned role.";

        }



        setFieldErrors(errors);

        return Object.keys(errors).length === 0;

    };



    const validateEditForm = () => {

        const errors = {};

        const nameTrimmed = (editForm.full_name || '').trim();

        if (!nameTrimmed) {

            errors.full_name = "Full name is required.";

        } else if (nameTrimmed.length < 2) {

            errors.full_name = "Full name must be at least 2 characters.";

        } else if (nameTrimmed.length > 100) {

            errors.full_name = "Full name cannot exceed 100 characters.";

        } else if (!FULL_NAME_REGEX.test(nameTrimmed) || !/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(nameTrimmed)) {

            errors.full_name = "Full name may only contain letters, spaces, dots, hyphens, and apostrophes.";

        }



        const rawPhone = (editForm.phone || '').trim().replace(/\s+/g, '');

        const cleanPhone = rawPhone.replace(/^(\+91)/, '');

        if (!cleanPhone) {

            errors.phone = "Mobile number is required.";

        } else if (!/^\d+$/.test(cleanPhone)) {

            errors.phone = "Mobile number must contain digits only.";

        } else if (!INDIAN_PHONE_REGEX.test(cleanPhone)) {

            errors.phone = "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.";

        }



        if (editForm.password) {

            if (editForm.password.length < 8) {

                errors.password = "New password must be at least 8 characters.";

            } else if (editForm.password.length > 100) {

                errors.password = "New password cannot exceed 100 characters.";

            } else if (!/[A-Z]/.test(editForm.password)) {

                errors.password = "Must contain at least one uppercase letter (A-Z).";

            } else if (!/[a-z]/.test(editForm.password)) {

                errors.password = "Must contain at least one lowercase letter (a-z).";

            } else if (!/[0-9]/.test(editForm.password)) {

                errors.password = "Must contain at least one number (0-9).";

            } else if (!SPECIAL_CHARS.test(editForm.password)) {

                errors.password = "Must contain at least one special character (!@#$%^&*...).";

            }



            if (!editForm.confirm_password) {

                errors.confirm_password = "Confirm password is required.";

            } else if (editForm.password !== editForm.confirm_password) {

                errors.confirm_password = "Passwords do not match.";

            }

        }



        if (!editForm.store_id) {

            errors.store_id = "Please select a store assignment.";

        }



        if (!editForm.role_id) {

            errors.role_id = "Please select an assigned role.";

        }



        setFieldErrors(errors);

        return Object.keys(errors).length === 0;

    };



    // ── Employee CRUD Operations ──

    const handleOpenAddModal = () => {

        setFieldErrors({});

        setModalError(null);

        setShowPassword(false);

        setShowConfirmPassword(false);

        const defaultRole = roles.find(r => r.name === 'cashier') || roles[0];

        setAddForm({

            ...initialAddForm,

            role_id: defaultRole ? defaultRole.id : '',

            store_id: stores[0]?.id || ''

        });

        setIsAddModalOpen(true);

    };



    const handleResetAddForm = () => {

        const defaultRole = roles.find(r => r.name === 'cashier') || roles[0];

        setAddForm({

            ...initialAddForm,

            role_id: defaultRole ? defaultRole.id : '',

            store_id: stores[0]?.id || ''

        });

        setFieldErrors({});

        setModalError(null);

    };



    const handleCreateEmployee = async (e) => {

        e.preventDefault();

        setModalError(null);

        if (!validateAddForm()) return;



        setActionLoading(true);

        try {

            const cleanPhone = addForm.phone.trim().replace(/\s+/g, '').replace(/^(\+91)/, '');

            const selectedRole = roleMap[addForm.role_id];

            const roleName = selectedRole ? selectedRole.name : undefined;



            const payload = {

                full_name: addForm.full_name.trim(),

                email: addForm.email.trim().toLowerCase(),

                phone: cleanPhone,

                password: addForm.password,

                role_id: Number(addForm.role_id),

                role: roleName,

                store_id: Number(addForm.store_id),

                pan_number: addForm.pan_number.trim() || null,

                addhar_number: addForm.addhar_number.trim() || null

            };



            const createdUserRes = await userService.createUser(payload);

            const createdUser = createdUserRes?.data || createdUserRes;



            // If account status was set to inactive, deactivate it after creation

            if (!addForm.is_active && createdUser?.id) {

                try {

                    await userService.deactivateUser(createdUser.id);

                } catch (deactErr) {

                    console.warn("Could not set initial inactive state:", deactErr);

                }

            }



            notificationService.success(`Employee ${payload.full_name} created successfully.`);

            setIsAddModalOpen(false);

            setAddForm(initialAddForm);

            await loadData();

        } catch (err) {

            console.error("Failed to create employee:", err);

            const detail = err.response?.data?.detail;

            const newErrors = {};



            if (typeof detail === 'string') {

                const lower = detail.toLowerCase();

                if (lower.includes('email already')) {

                    newErrors.email = "Email address is already registered. Please use another email.";

                } else if (lower.includes('phone') && (lower.includes('already') || lower.includes('in use'))) {

                    newErrors.phone = "Mobile number is already registered. Please use another number.";

                } else if (lower.includes('role')) {

                    newErrors.role_id = detail;

                } else if (lower.includes('store')) {

                    newErrors.store_id = detail;

                } else {

                    setModalError(detail);

                }

            } else if (Array.isArray(detail)) {

                detail.forEach(d => {

                    const field = d.loc?.[d.loc.length - 1];

                    if (field) {

                        newErrors[field] = d.msg;

                    }

                });

            }



            if (Object.keys(newErrors).length > 0) {

                setFieldErrors(prev => ({ ...prev, ...newErrors }));

                setModalError("Please fix the validation errors below.");

            } else if (!modalError) {

                setModalError(typeof detail === 'string' ? detail : "Failed to create employee.");

            }

        } finally {

            setActionLoading(false);

        }

    };



    const handleOpenEditModal = (user) => {

        setFieldErrors({});

        setModalError(null);

        setShowEditPassword(false);

        setShowEditConfirmPassword(false);

        setEditingUser(user);

        setEditForm({

            id: user.id,

            full_name: user.full_name || '',

            email: user.email || '',

            phone: user.phone || '',

            role_id: user.role_id || user.role?.id || '',

            store_id: user.store_id || '',

            is_active: user.is_active ?? true,

            password: '',

            confirm_password: '',

            pan_number: user.pan_number || '',

            addhar_number: user.addhar_number || ''

        });

        setIsEditModalOpen(true);

    };



    const handleUpdateEmployee = async (e) => {

        e.preventDefault();

        setModalError(null);

        if (!validateEditForm()) return;



        setActionLoading(true);

        try {

            const cleanPhone = editForm.phone.trim().replace(/\s+/g, '').replace(/^(\+91)/, '');

            const payload = {

                full_name: editForm.full_name.trim(),

                phone: cleanPhone,

                role_id: Number(editForm.role_id),

                store_id: Number(editForm.store_id),

                is_active: Boolean(editForm.is_active),

                pan_number: editForm.pan_number.trim() || null,

                addhar_number: editForm.addhar_number.trim() || null

            };

            if (editForm.password && editForm.password.trim()) {

                payload.password = editForm.password;

            }



            await userService.updateUser(editForm.id, payload);

            notificationService.success(`Employee ${payload.full_name} updated successfully.`);

            setIsEditModalOpen(false);

            setEditingUser(null);

            await loadData();

        } catch (err) {

            console.error("Failed to update employee:", err);

            const detail = err.response?.data?.detail;

            const newErrors = {};



            if (typeof detail === 'string') {

                const lower = detail.toLowerCase();

                if (lower.includes('phone') && (lower.includes('already') || lower.includes('in use'))) {

                    newErrors.phone = "Mobile number is already registered to another user.";

                } else {

                    setModalError(detail);

                }

            } else if (Array.isArray(detail)) {

                detail.forEach(d => {

                    const field = d.loc?.[d.loc.length - 1];

                    if (field) {

                        newErrors[field] = d.msg;

                    }

                });

            }



            if (Object.keys(newErrors).length > 0) {

                setFieldErrors(prev => ({ ...prev, ...newErrors }));

                setModalError("Please fix the validation errors below.");

            } else if (!modalError) {

                setModalError(typeof detail === 'string' ? detail : "Failed to update employee details.");

            }

        } finally {

            setActionLoading(false);

        }

    };



    const handleToggleStatus = async (user) => {

        setActionLoading(true);

        try {

            if (user.is_active) {

                await userService.deactivateUser(user.id);

                notificationService.success(`Deactivated ${user.full_name}.`);

            } else {

                await userService.activateUser(user.id);

                notificationService.success(`Activated ${user.full_name}.`);

            }

            await loadData();

        } catch (err) {

            console.error("Failed to toggle user status:", err);

            const msg = err.response?.data?.detail || "Could not change employee status.";

            notificationService.error(msg);

        } finally {

            setActionLoading(false);

        }

    };



    const handleOpenDeleteModal = (user) => {

        setDeletingUser(user);

        setIsDeleteModalOpen(true);

    };



    const handleConfirmDelete = async () => {

        if (!deletingUser) return;

        setActionLoading(true);

        try {

            await userService.deleteUser(deletingUser.id);

            notificationService.success(`Removed ${deletingUser.full_name} from staff.`);

            setIsDeleteModalOpen(false);

            setDeletingUser(null);

            await loadData();

        } catch (err) {

            console.error("Failed to delete user:", err);

            const msg = err.response?.data?.detail || "Could not delete employee record.";

            notificationService.error(msg);

        } finally {

            setActionLoading(false);

        }

    };



    return (

        <PageContainer className="employees-page">

            {/* 1. Standardized Dashboard Header */}

            <PageHeader

                title="Staff"

                subtitle="Manage cashiers, managers, role assignments, and system credentials."

                icon={<BsPersonBadge />}

                actions={

                    <>

                        <button

                            type="button"

                            onClick={loadData}

                            disabled={loading || actionLoading}

                            className="adm-btn-secondary"

                            style={{

                                display: 'inline-flex',

                                alignItems: 'center',

                                gap: 6,

                                padding: '10px 14px',

                                borderRadius: 8,

                                background: '#fff',

                                border: '1px solid #e2e8f0',

                                color: '#475569',

                                fontSize: 13,

                                fontWeight: 600,

                                cursor: 'pointer',

                                transition: 'all 0.15s ease'

                            }}

                        >

                            <BsArrowRepeat size={14} className={loading ? 'spin-anim' : ''} />

                            <span>Refresh</span>

                        </button>



                        <button

                            type="button"

                            onClick={handleOpenAddModal}

                            className="adm-btn-primary"

                            style={{

                                display: 'inline-flex',

                                alignItems: 'center',

                                gap: 6,

                                padding: '10px 18px',

                                borderRadius: 8,

                                background: '#2563eb',

                                border: 'none',

                                color: '#fff',

                                fontSize: 13,

                                fontWeight: 700,

                                cursor: 'pointer',

                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',

                                transition: 'all 0.15s ease'

                            }}

                        >

                            <BsPlus size={18} />

                            <span>Add Employee</span>

                        </button>

                    </>

                }

            />



            {/* 2. Interactive KPI Summary Cards */}

            <KpiGrid columns={4}>

                <KpiCard

                    variant="revenue"

                    icon={<BsPeopleFill />}
<<<<<<< HEAD

                    title="Total Employees"

=======
                    title="Total Staff"
>>>>>>> Punam
                    value={kpiStats.total}

                    subtitle="All registered staff members"

                    active={statusFilter === 'all'}

                    onClick={() => {

                        setStatusFilter('all');

                        setPage(1);

                    }}
<<<<<<< HEAD

                    tooltip="Click to view all registered employees"

=======
                    tooltip="Click to view all registered staff"
>>>>>>> Punam
                />

                <KpiCard

                    variant="profit"

                    icon={<BsCheckCircleFill />}
<<<<<<< HEAD

                    title="Active Employees"

=======
                    title="Active Staff"
>>>>>>> Punam
                    value={kpiStats.active}

                    subtitle="Operational staff members"

                    active={statusFilter === 'active'}

                    onClick={() => {

                        setStatusFilter(prev => prev === 'active' ? 'all' : 'active');

                        setPage(1);

                    }}
<<<<<<< HEAD

                    tooltip="Click to filter by active employees"

=======
                    tooltip="Click to filter by active staff"
>>>>>>> Punam
                />

                <KpiCard

                    variant="cost"

                    icon={<BsXCircleFill />}
<<<<<<< HEAD

                    title="Inactive Employees"

=======
                    title="Inactive Staff"
>>>>>>> Punam
                    value={kpiStats.inactive}

                    subtitle="Deactivated user credentials"

                    active={statusFilter === 'inactive'}

                    onClick={() => {

                        setStatusFilter(prev => prev === 'inactive' ? 'all' : 'inactive');

                        setPage(1);

                    }}
<<<<<<< HEAD

                    tooltip="Click to filter by inactive employees"

=======
                    tooltip="Click to filter by inactive staff"
>>>>>>> Punam
                />

                <KpiCard

                    variant="margin"

                    icon={<BsShieldCheck />}

                    title="Total Roles"

                    value={kpiStats.totalRoles}

                    subtitle="Manage Roles & Permissions →"

                    active={false}

                    onClick={() => navigate('/roles-permissions')}

                    tooltip="Click to view and configure Roles & Permissions"

                />

            </KpiGrid>



            {/* 3. Error Banner */}

            {error && (

                <div style={{

                    display: 'flex',

                    alignItems: 'center',

                    justifyContent: 'space-between',

                    gap: 10,

                    padding: '12px 16px',

                    borderRadius: 10,

                    background: '#fef2f2',

                    border: '1px solid #fecaca',

                    color: '#991b1b',

                    fontSize: 13,

                    fontWeight: 600,

                    marginBottom: 16

                }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                        <BsExclamationTriangle color="#ef4444" size={16} />

                        <span><strong>API Error:</strong> {error}</span>

                    </div>

                    <button

                        type="button"

                        onClick={loadData}

                        style={{

                            background: '#fff',

                            border: '1px solid #f87171',

                            borderRadius: 6,

                            padding: '4px 12px',

                            fontSize: 12,

                            fontWeight: 600,

                            color: '#b91c1c',

                            cursor: 'pointer'

                        }}

                    >

                        Retry

                    </button>

                </div>

            )}



            {/* 4. Filter & Search Bar */}

            <div className="employees-filter-bar">

                <div className="employees-filters-left">

                    {/* Search by Name, Email, Phone */}

                    <div className="employees-search-box">

                        <BsSearch size={14} color="#94a3b8" style={{ marginRight: 8, flexShrink: 0 }} />

                        <input

                            type="text"

                            className="employees-search-input"

                            value={search}

                            onChange={e => setSearch(e.target.value)}

                            placeholder="Search by staff name, email, or phone..."

                        />

                        {search && (

                            <button

                                type="button"

                                onClick={() => setSearch('')}

                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 13, padding: 0 }}

                                title="Clear search"

                            >

                                <BsX size={16} />

                            </button>

                        )}

                    </div>



                    {/* Role Filter Dropdown */}

                    <div className="employees-filter-select-wrap">

                        <span className="employees-filter-label">Role:</span>

                        <select

                            className="employees-filter-select"

                            value={roleFilter}

                            onChange={e => setRoleFilter(e.target.value)}

                        >

                            <option value="all">All Roles</option>

                            {roles.map(r => (

                                <option key={r.id} value={r.id}>

                                    {formatRoleLabel(r.name)}

                                </option>

                            ))}

                        </select>

                    </div>



                    {/* Store Filter Dropdown */}

                    <div className="employees-filter-select-wrap">

                        <span className="employees-filter-label">Store:</span>

                        <select

                            className="employees-filter-select"

                            value={storeFilter}

                            onChange={e => setStoreFilter(e.target.value)}

                        >

                            <option value="all">All Stores</option>

                            <option value="unassigned">Unassigned / Head Office</option>

                            {stores.map(s => (

                                <option key={s.id} value={s.id}>

                                    {s.name} {s.code ? `(${s.code})` : ''}

                                </option>

                            ))}

                        </select>

                    </div>



                    {/* Status Filter Dropdown */}

                    <div className="employees-filter-select-wrap">

                        <span className="employees-filter-label">Status:</span>

                        <select

                            className="employees-filter-select"

                            value={statusFilter}

                            onChange={e => setStatusFilter(e.target.value)}

                        >

                            <option value="all">All Status</option>

                            <option value="active">Active Only</option>

                            <option value="inactive">Inactive Only</option>

                        </select>

                    </div>

                </div>



                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>

                    Matching Staff: <strong style={{ color: '#0f172a' }}>{filteredUsers.length}</strong>

                </div>

            </div>



            {/* 5. Employee Listing Table Card */}

            <div className="employees-table-card">

                <div className="employees-table-responsive">

                    <table className="employees-table">

                        <thead>

                            <tr>

                                <th>Staff Member</th>

                                <th>Email</th>

                                <th>Phone</th>

                                <th>Store</th>

                                <th>Assigned Role</th>

                                <th>Status</th>

                                <th style={{ textAlign: 'right', minWidth: 120 }}>Actions</th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading && users.length === 0 ? (

                                <tr>

                                    <td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>

                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>

                                            <BsArrowRepeat className="spin-anim" size={20} color="#6366f1" />

                                            <span>Loading employee records from backend...</span>

                                        </div>

                                    </td>

                                </tr>

                            ) : paginatedUsers.length === 0 ? (

                                <tr>

                                    <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

                                            <BsPersonBadge size={38} color="#cbd5e1" />

                                            <strong style={{ fontSize: 15, color: '#475569' }}>No staff members found</strong>

                                            <span style={{ fontSize: 13 }}>

                                                {search || roleFilter !== 'all' || storeFilter !== 'all' || statusFilter !== 'all'

                                                    ? 'Try adjusting your search query or filter criteria.'

                                                    : 'No employees have been created yet. Click "Add Employee" to create your first member.'}

                                            </span>

                                            {(search || roleFilter !== 'all' || storeFilter !== 'all' || statusFilter !== 'all') && (

                                                <button

                                                    type="button"

                                                    onClick={() => { setSearch(''); setRoleFilter('all'); setStoreFilter('all'); setStatusFilter('all'); }}

                                                    style={{

                                                        marginTop: 6,

                                                        padding: '6px 14px',

                                                        borderRadius: 6,

                                                        border: '1px solid #cbd5e1',

                                                        background: '#fff',

                                                        fontSize: 12,

                                                        fontWeight: 600,

                                                        color: '#475569',

                                                        cursor: 'pointer'

                                                    }}

                                                >

                                                    Clear All Filters

                                                </button>

                                            )}

                                        </div>

                                    </td>

                                </tr>

                            ) : (

                                paginatedUsers.map((user) => {

                                    const assignedStore = user.store_id ? storeMap[user.store_id] : null;

                                    const roleObj = user.role || roleMap[user.role_id];

                                    const roleName = roleObj?.name || 'Staff';

                                    const roleClass = getRoleClass(roleName);



                                    return (

                                        <tr key={user.id}>

                                            {/* 1. Staff Member */}

                                            <td>

                                                <div className="employee-member-cell">

                                                    {user.profile_photo ? (

                                                        <img

                                                            src={user.profile_photo}

                                                            alt={user.full_name}

                                                            className="employee-avatar"

                                                            style={{ objectFit: 'cover' }}

                                                            onError={(e) => {

                                                                e.target.style.display = 'none';

                                                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';

                                                            }}

                                                        />

                                                    ) : null}

                                                    <div

                                                        className="employee-avatar"

                                                        style={{ display: user.profile_photo ? 'none' : 'flex' }}

                                                    >

                                                        {getInitials(user.full_name)}

                                                    </div>

                                                    <div className="employee-name-wrap">

                                                        <div className="employee-name">{user.full_name}</div>

                                                        <div className="employee-meta">

                                                            {user.created_at ? `Joined ${new Date(user.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : (user.is_active ? 'Active Staff' : 'Inactive')}

                                                        </div>

                                                    </div>

                                                </div>

                                            </td>



                                            {/* 3. Email */}

                                            <td>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 500 }}>

                                                    <BsEnvelope size={13} color="#94a3b8" />

                                                    <span>{user.email || '—'}</span>

                                                </div>

                                            </td>



                                            {/* 4. Phone */}

                                            <td>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155', fontWeight: 500 }}>

                                                    <BsTelephone size={13} color="#94a3b8" />

                                                    <span>{user.phone ? `+91 ${user.phone.replace(/^(\+91)/, '')}` : '—'}</span>

                                                </div>

                                            </td>



                                            {/* 5. Store */}

                                            <td>

                                                {assignedStore ? (

                                                    <span className="employee-store-badge" title={`Store ID #${assignedStore.id}`}>

                                                        <BsShop size={12} color="#6366f1" />

                                                        <span>{assignedStore.name}</span>

                                                    </span>

                                                ) : (

                                                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>

                                                        All Stores / Head Office

                                                    </span>

                                                )}

                                            </td>



                                            {/* 6. Assigned Role */}

                                            <td>

                                                <span className={`employee-role-badge ${roleClass}`}>

                                                    <BsShieldCheck size={12} />

                                                    <span>{formatRoleLabel(roleName)}</span>

                                                </span>

                                            </td>



                                            {/* 7. Status */}

                                            <td>

                                                <span className={`employee-status-badge ${user.is_active ? 'active' : 'inactive'}`}>

                                                    <span className={`employee-status-dot ${user.is_active ? 'active' : 'inactive'}`} />

                                                    <span>{user.is_active ? 'Active' : 'Inactive'}</span>

                                                </span>

                                            </td>



                                            {/* 8. Actions */}

                                            <td>

                                                <div className="employee-actions-cell">

                                                    {/* Quick Toggle Status */}

                                                    <button

                                                        type="button"

                                                        className="employee-btn-action toggle"

                                                        title={user.is_active ? "Deactivate employee account" : "Activate employee account"}

                                                        onClick={() => handleToggleStatus(user)}

                                                        disabled={actionLoading}

                                                    >

                                                        {user.is_active ? (

                                                            <BsCheckCircleFill size={14} color="#10b981" />

                                                        ) : (

                                                            <BsXCircleFill size={14} color="#94a3b8" />

                                                        )}

                                                    </button>



                                                    {/* Edit Button */}

                                                    <button

                                                        type="button"

                                                        className="employee-btn-action edit"

                                                        title="Edit employee details & store assignment"

                                                        onClick={() => handleOpenEditModal(user)}

                                                        disabled={actionLoading}

                                                    >

                                                        <BsPencilSquare size={13} />

                                                    </button>



                                                    {/* Delete Button */}

                                                    <button

                                                        type="button"

                                                        className="employee-btn-action delete"

                                                        title="Delete employee from system"

                                                        onClick={() => handleOpenDeleteModal(user)}

                                                        disabled={actionLoading}

                                                    >

                                                        <BsTrash size={13} />

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



                {/* Pagination Controls */}

                {filteredUsers.length > 0 && (

                    <div className="employees-pagination-bar">

                        <div className="employees-pagination-info">

                            Showing <strong>{Math.min(totalItems, (currentPage - 1) * pageSize + 1)}</strong> to{' '}

                            <strong>{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}

                            <strong>{totalItems}</strong> employee{totalItems === 1 ? '' : 's'}

                        </div>



                        <div className="employees-pagination-controls">

                            <span style={{ fontSize: 12, color: '#64748b', marginRight: 4 }}>Rows per page:</span>

                            <select

                                value={pageSize}

                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}

                                style={{

                                    padding: '4px 8px',

                                    borderRadius: 6,

                                    border: '1px solid #cbd5e1',

                                    fontSize: 12,

                                    marginRight: 12,

                                    outline: 'none',

                                    background: '#fff',

                                    cursor: 'pointer'

                                }}

                            >

                                <option value={10}>10</option>

                                <option value={20}>20</option>

                                <option value={50}>50</option>

                            </select>



                            <button

                                type="button"

                                className="employees-page-btn"

                                onClick={() => setPage(p => Math.max(1, p - 1))}

                                disabled={currentPage <= 1 || loading}

                            >

                                <BsChevronLeft size={12} /> Previous

                            </button>



                            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', margin: '0 6px' }}>

                                Page {currentPage} of {totalPages}

                            </span>



                            <button

                                type="button"

                                className="employees-page-btn"

                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}

                                disabled={currentPage >= totalPages || loading}

                            >

                                Next <BsChevronRight size={12} />

                            </button>

                        </div>

                    </div>

                )}

            </div>



            {/* ============================================================ */}

            {/* ADD EMPLOYEE MODAL (Section 2 & 3 Requirements)            */}

            {/* ============================================================ */}

            {isAddModalOpen && (

                <div className="employees-modal-overlay">

                    <div className="employees-modal-card">

                        <div className="employees-modal-header">

                            <div>

                                <h3 className="employees-modal-title">Add New Employee</h3>

                                <p className="employees-modal-subtitle">Register staff member, assign store, and configure credentials</p>

                            </div>

                            <button

                                type="button"

                                onClick={() => setIsAddModalOpen(false)}

                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}

                            >

                                <BsX size={22} />

                            </button>

                        </div>



                        <form onSubmit={handleCreateEmployee}>

                            <div className="employees-modal-body">

                                {modalError && (

                                    <div style={{

                                        display: 'flex',

                                        alignItems: 'center',

                                        gap: 8,

                                        padding: '10px 14px',

                                        borderRadius: 8,

                                        background: '#fef2f2',

                                        border: '1px solid #fecaca',

                                        color: '#991b1b',

                                        fontSize: 12.5,

                                        fontWeight: 600

                                    }}>

                                        <BsExclamationTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />

                                        <span>{modalError}</span>

                                    </div>

                                )}



                                {/* Full Name & Email Address */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Full Name <span className="required-star">*</span>

                                        </label>

                                        <input

                                            type="text"

                                            className={`employees-form-input ${fieldErrors.full_name ? 'has-error' : ''}`}

                                            placeholder="e.g. Rahul Sharma"

                                            value={addForm.full_name}

                                            onChange={e => handleAddChange('full_name', e.target.value)}

                                            maxLength={100}

                                            required

                                        />

                                        {fieldErrors.full_name && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.full_name}

                                            </span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Email Address <span className="required-star">*</span>

                                        </label>

                                        <input

                                            type="email"

                                            className={`employees-form-input ${fieldErrors.email ? 'has-error' : ''}`}

                                            placeholder="e.g. rahul@retailos.in"

                                            value={addForm.email}

                                            onChange={e => handleAddChange('email', e.target.value)}

                                            required

                                        />

                                        {fieldErrors.email && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.email}

                                            </span>

                                        )}

                                    </div>

                                </div>



                                {/* Mobile Number & Employee ID (Informative / Auto-assigned) */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Mobile Number <span className="required-star">*</span>

                                        </label>

                                        <input

                                            type="tel"

                                            maxLength={10}

                                            className={`employees-form-input ${fieldErrors.phone ? 'has-error' : ''}`}

                                            placeholder="10-digit mobile (e.g. 9876543210)"

                                            value={addForm.phone}

                                            onChange={e => handleAddChange('phone', e.target.value.replace(/\D/g, ''))}

                                            required

                                        />

                                        {fieldErrors.phone ? (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.phone}

                                            </span>

                                        ) : (

                                            <span className="employees-form-help">Enter 10-digit number starting with 6, 7, 8, or 9</span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Employee ID

                                        </label>

                                        <input

                                            type="text"

                                            className="employees-form-input"

                                            value="Auto-generated by system (#ID)"

                                            disabled

                                            title="System automatically assigns a unique sequential ID upon creation"

                                        />

                                        <span className="employees-form-help">Sequential identifier generated by backend</span>

                                    </div>

                                </div>



                                {/* Password & Confirm Password */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Password <span className="required-star">*</span>

                                        </label>

                                        <div className="employees-password-wrap">

                                            <input

                                                type={showPassword ? "text" : "password"}

                                                className={`employees-form-input employees-password-input ${fieldErrors.password ? 'has-error' : ''}`}

                                                placeholder="Min 8 chars (1 upper, 1 lower, 1 digit, 1 special)"

                                                value={addForm.password}

                                                onChange={e => handleAddChange('password', e.target.value)}

                                                required

                                            />

                                            <button

                                                type="button"

                                                className="employees-password-toggle"

                                                onClick={() => setShowPassword(p => !p)}

                                                title={showPassword ? "Hide password" : "Show password"}

                                            >

                                                {showPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}

                                            </button>

                                        </div>

                                        {fieldErrors.password ? (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.password}

                                            </span>

                                        ) : (

                                            <span className="employees-form-help">Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 symbol</span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Confirm Password <span className="required-star">*</span>

                                        </label>

                                        <div className="employees-password-wrap">

                                            <input

                                                type={showConfirmPassword ? "text" : "password"}

                                                className={`employees-form-input employees-password-input ${fieldErrors.confirm_password ? 'has-error' : ''}`}

                                                placeholder="Re-enter password to confirm"

                                                value={addForm.confirm_password}

                                                onChange={e => handleAddChange('confirm_password', e.target.value)}

                                                required

                                            />

                                            <button

                                                type="button"

                                                className="employees-password-toggle"

                                                onClick={() => setShowConfirmPassword(p => !p)}

                                                title={showConfirmPassword ? "Hide password" : "Show password"}

                                            >

                                                {showConfirmPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}

                                            </button>

                                        </div>

                                        {fieldErrors.confirm_password && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.confirm_password}

                                            </span>

                                        )}

                                    </div>

                                </div>



                                {/* Store Assignment & Role Assignment */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Store Assignment <span className="required-star">*</span>

                                        </label>

                                        <select

                                            className={`employees-form-input ${fieldErrors.store_id ? 'has-error' : ''}`}

                                            value={addForm.store_id}

                                            onChange={e => handleAddChange('store_id', e.target.value)}

                                            required

                                        >

                                            <option value="">-- Select Store Assignment --</option>

                                            {stores.map(s => (

                                                <option key={s.id} value={s.id}>

                                                    {s.name} {s.code ? `(${s.code})` : ''}

                                                </option>

                                            ))}

                                        </select>

                                        {fieldErrors.store_id && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.store_id}

                                            </span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Role Assignment <span className="required-star">*</span>

                                        </label>

                                        <select

                                            className={`employees-form-input ${fieldErrors.role_id ? 'has-error' : ''}`}

                                            value={addForm.role_id}

                                            onChange={e => handleAddChange('role_id', e.target.value)}

                                            required

                                        >

                                            <option value="">-- Select Role Assignment --</option>

                                            {roles.map(r => (

                                                <option key={r.id} value={r.id}>

                                                    {formatRoleLabel(r.name)} (ID: #{r.id})

                                                </option>

                                            ))}

                                        </select>

                                        {fieldErrors.role_id && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.role_id}

                                            </span>

                                        )}

                                    </div>

                                </div>



                                {/* Account Status */}

                                <div className="employees-form-group">

                                    <label className="employees-form-label">

                                        Account Status

                                    </label>

                                    <select

                                        className="employees-form-input"

                                        value={addForm.is_active ? 'active' : 'inactive'}

                                        onChange={e => handleAddChange('is_active', e.target.value === 'active')}

                                    >

                                        <option value="active">Active (Full access to system per assigned role)</option>

                                        <option value="inactive">Inactive (Credentials created, access suspended)</option>

                                    </select>

                                </div>



                                {/* Optional KYC Documents (PAN & Aadhaar) */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            PAN Number (Optional)

                                        </label>

                                        <input

                                            type="text"

                                            maxLength={10}

                                            className="employees-form-input"

                                            placeholder="e.g. ABCDE1234F"

                                            value={addForm.pan_number}

                                            onChange={e => handleAddChange('pan_number', e.target.value.toUpperCase())}

                                        />

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Aadhaar Number (Optional)

                                        </label>

                                        <input

                                            type="text"

                                            maxLength={12}

                                            className="employees-form-input"

                                            placeholder="12-digit number"

                                            value={addForm.addhar_number}

                                            onChange={e => handleAddChange('addhar_number', e.target.value.replace(/\D/g, ''))}

                                        />

                                    </div>

                                </div>

                            </div>



                            <div className="employees-modal-footer">

                                <button

                                    type="button"

                                    className="employees-btn-reset"

                                    onClick={handleResetAddForm}

                                    disabled={actionLoading}

                                    title="Reset form fields to defaults"

                                >

                                    <BsArrowRepeat size={13} />

                                    <span>Reset</span>

                                </button>



                                <button

                                    type="button"

                                    onClick={() => setIsAddModalOpen(false)}

                                    disabled={actionLoading}

                                    style={{

                                        padding: '9px 16px',

                                        borderRadius: 8,

                                        border: '1px solid #cbd5e1',

                                        background: '#fff',

                                        fontSize: 13,

                                        fontWeight: 600,

                                        color: '#475569',

                                        cursor: 'pointer'

                                    }}

                                >

                                    Cancel

                                </button>



                                <button

                                    type="submit"

                                    disabled={actionLoading}

                                    style={{

                                        padding: '9px 22px',

                                        borderRadius: 8,

                                        border: 'none',

                                        background: '#2563eb',

                                        fontSize: 13,

                                        fontWeight: 700,

                                        color: '#fff',

                                        cursor: actionLoading ? 'not-allowed' : 'pointer',

                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',

                                        display: 'inline-flex',

                                        alignItems: 'center',

                                        gap: 6,

                                        opacity: actionLoading ? 0.7 : 1

                                    }}

                                >

                                    {actionLoading ? (

                                        <>

                                            <BsArrowRepeat className="spin-anim" size={14} />

                                            <span>Saving Employee...</span>

                                        </>

                                    ) : (

                                        <>

                                            <BsPlus size={18} />

                                            <span>Save Employee</span>

                                        </>

                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}



            {/* ============================================================ */}

            {/* EDIT EMPLOYEE MODAL                                         */}

            {/* ============================================================ */}

            {isEditModalOpen && editingUser && (

                <div className="employees-modal-overlay">

                    <div className="employees-modal-card">

                        <div className="employees-modal-header">

                            <div>

                                <h3 className="employees-modal-title">Edit Employee</h3>

                                <p className="employees-modal-subtitle">Update role, store, and profile details for {editingUser.full_name}</p>

                            </div>

                            <button

                                type="button"

                                onClick={() => setIsEditModalOpen(false)}

                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}

                            >

                                <BsX size={22} />

                            </button>

                        </div>



                        <form onSubmit={handleUpdateEmployee}>

                            <div className="employees-modal-body">

                                {modalError && (

                                    <div style={{

                                        display: 'flex',

                                        alignItems: 'center',

                                        gap: 8,

                                        padding: '10px 14px',

                                        borderRadius: 8,

                                        background: '#fef2f2',

                                        border: '1px solid #fecaca',

                                        color: '#991b1b',

                                        fontSize: 12.5,

                                        fontWeight: 600

                                    }}>

                                        <BsExclamationTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />

                                        <span>{modalError}</span>

                                    </div>

                                )}



                                {/* Full Name & Email */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Employee Name <span className="required-star">*</span>

                                        </label>

                                        <input

                                            type="text"

                                            className={`employees-form-input ${fieldErrors.full_name ? 'has-error' : ''}`}

                                            value={editForm.full_name}

                                            onChange={e => handleEditChange('full_name', e.target.value)}

                                            maxLength={100}

                                            required

                                        />

                                        {fieldErrors.full_name && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.full_name}

                                            </span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Email Address (Read Only)

                                        </label>

                                        <input

                                            type="email"

                                            className="employees-form-input"

                                            value={editForm.email}

                                            disabled

                                            title="Email address cannot be modified once created"

                                        />

                                        <span className="employees-form-help">Email is permanent login identifier</span>

                                    </div>

                                </div>



                                {/* Phone & Password Reset */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Phone Number <span className="required-star">*</span>

                                        </label>

                                        <input

                                            type="tel"

                                            maxLength={10}

                                            className={`employees-form-input ${fieldErrors.phone ? 'has-error' : ''}`}

                                            value={editForm.phone}

                                            onChange={e => handleEditChange('phone', e.target.value.replace(/\D/g, ''))}

                                            required

                                        />

                                        {fieldErrors.phone && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.phone}

                                            </span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            New Password (Optional)

                                        </label>

                                        <div className="employees-password-wrap">

                                            <input

                                                type={showEditPassword ? "text" : "password"}

                                                className={`employees-form-input employees-password-input ${fieldErrors.password ? 'has-error' : ''}`}

                                                placeholder="Leave blank to keep existing password"

                                                value={editForm.password}

                                                onChange={e => handleEditChange('password', e.target.value)}

                                            />

                                            <button

                                                type="button"

                                                className="employees-password-toggle"

                                                onClick={() => setShowEditPassword(p => !p)}

                                                title={showEditPassword ? "Hide password" : "Show password"}

                                            >

                                                {showEditPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}

                                            </button>

                                        </div>

                                        {fieldErrors.password && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.password}

                                            </span>

                                        )}

                                    </div>

                                </div>



                                {/* Confirm New Password if entered */}

                                {editForm.password ? (

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Confirm New Password <span className="required-star">*</span>

                                        </label>

                                        <div className="employees-password-wrap">

                                            <input

                                                type={showEditConfirmPassword ? "text" : "password"}

                                                className={`employees-form-input employees-password-input ${fieldErrors.confirm_password ? 'has-error' : ''}`}

                                                placeholder="Re-enter new password"

                                                value={editForm.confirm_password}

                                                onChange={e => handleEditChange('confirm_password', e.target.value)}

                                            />

                                            <button

                                                type="button"

                                                className="employees-password-toggle"

                                                onClick={() => setShowEditConfirmPassword(p => !p)}

                                                title={showEditConfirmPassword ? "Hide password" : "Show password"}

                                            >

                                                {showEditConfirmPassword ? <BsEyeSlash size={16} /> : <BsEye size={16} />}

                                            </button>

                                        </div>

                                        {fieldErrors.confirm_password && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.confirm_password}

                                            </span>

                                        )}

                                    </div>

                                ) : null}



                                {/* Role & Store Assignment */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Assigned Role <span className="required-star">*</span>

                                        </label>

                                        <select

                                            className={`employees-form-input ${fieldErrors.role_id ? 'has-error' : ''}`}

                                            value={editForm.role_id}

                                            onChange={e => handleEditChange('role_id', e.target.value)}

                                            required

                                        >

                                            <option value="">-- Select Role Assignment --</option>

                                            {roles.map(r => (

                                                <option key={r.id} value={r.id}>

                                                    {formatRoleLabel(r.name)} (ID: #{r.id})

                                                </option>

                                            ))}

                                        </select>

                                        {fieldErrors.role_id && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.role_id}

                                            </span>

                                        )}

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Store Assignment <span className="required-star">*</span>

                                        </label>

                                        <select

                                            className={`employees-form-input ${fieldErrors.store_id ? 'has-error' : ''}`}

                                            value={editForm.store_id}

                                            onChange={e => handleEditChange('store_id', e.target.value)}

                                            required

                                        >

                                            <option value="">-- Select Store Assignment --</option>

                                            {stores.map(s => (

                                                <option key={s.id} value={s.id}>

                                                    {s.name} {s.code ? `(${s.code})` : ''}

                                                </option>

                                            ))}

                                        </select>

                                        {fieldErrors.store_id && (

                                            <span className="employees-form-error">

                                                <BsExclamationTriangle size={12} /> {fieldErrors.store_id}

                                            </span>

                                        )}

                                    </div>

                                </div>



                                {/* Status & KYC */}

                                <div className="employees-form-grid-2">

                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            Account Status

                                        </label>

                                        <select

                                            className="employees-form-input"

                                            value={editForm.is_active ? 'active' : 'inactive'}

                                            onChange={e => handleEditChange('is_active', e.target.value === 'active')}

                                        >

                                            <option value="active">Active (Full System Access)</option>

                                            <option value="inactive">Inactive (Access Suspended)</option>

                                        </select>

                                    </div>



                                    <div className="employees-form-group">

                                        <label className="employees-form-label">

                                            PAN Number (Optional)

                                        </label>

                                        <input

                                            type="text"

                                            maxLength={10}

                                            className="employees-form-input"

                                            placeholder="e.g. ABCDE1234F"

                                            value={editForm.pan_number}

                                            onChange={e => handleEditChange('pan_number', e.target.value.toUpperCase())}

                                        />

                                    </div>

                                </div>

                            </div>



                            <div className="employees-modal-footer">

                                <button

                                    type="button"

                                    onClick={() => setIsEditModalOpen(false)}

                                    disabled={actionLoading}

                                    style={{

                                        padding: '9px 16px',

                                        borderRadius: 8,

                                        border: '1px solid #cbd5e1',

                                        background: '#fff',

                                        fontSize: 13,

                                        fontWeight: 600,

                                        color: '#475569',

                                        cursor: 'pointer'

                                    }}

                                >

                                    Cancel

                                </button>



                                <button

                                    type="submit"

                                    disabled={actionLoading}

                                    style={{

                                        padding: '9px 20px',

                                        borderRadius: 8,

                                        border: 'none',

                                        background: '#2563eb',

                                        fontSize: 13,

                                        fontWeight: 700,

                                        color: '#fff',

                                        cursor: actionLoading ? 'not-allowed' : 'pointer',

                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',

                                        display: 'inline-flex',

                                        alignItems: 'center',

                                        gap: 6

                                    }}

                                >

                                    {actionLoading ? (

                                        <>

                                            <BsArrowRepeat className="spin-anim" size={14} />

                                            <span>Saving...</span>

                                        </>

                                    ) : (

                                        <span>Save Changes</span>

                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}



            {/* ============================================================ */}

            {/* DELETE EMPLOYEE CONFIRMATION MODAL                          */}

            {/* ============================================================ */}

            {isDeleteModalOpen && deletingUser && (

                <div className="employees-modal-overlay">

                    <div className="employees-modal-card" style={{ maxWidth: 440 }}>

                        <div className="employees-modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

                                <div style={{

                                    width: 36,

                                    height: 36,

                                    borderRadius: 10,

                                    background: '#fef2f2',

                                    color: '#dc2626',

                                    display: 'flex',

                                    alignItems: 'center',

                                    justifyContent: 'center'

                                }}>

                                    <BsTrash size={18} />

                                </div>

                                <h3 className="employees-modal-title" style={{ fontSize: 17 }}>Delete Employee</h3>

                            </div>

                            <button

                                type="button"

                                onClick={() => setIsDeleteModalOpen(false)}

                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}

                            >

                                <BsX size={22} />

                            </button>

                        </div>



                        <div className="employees-modal-body" style={{ padding: '16px 24px' }}>

                            <p style={{ fontSize: 13.5, color: '#334155', margin: 0, lineHeight: 1.5 }}>

                                Are you sure you want to permanently delete <strong>{deletingUser.full_name}</strong>?

                            </p>

                            <p style={{ fontSize: 12.5, color: '#64748b', margin: '8px 0 0', lineHeight: 1.4 }}>

                                Email: <code>{deletingUser.email}</code><br />

                                This will remove their credentials and revoke access immediately.

                            </p>

                        </div>



                        <div className="employees-modal-footer">

                            <button

                                type="button"

                                onClick={() => setIsDeleteModalOpen(false)}

                                disabled={actionLoading}

                                style={{

                                    padding: '8px 16px',

                                    borderRadius: 8,

                                    border: '1px solid #cbd5e1',

                                    background: '#fff',

                                    fontSize: 13,

                                    fontWeight: 600,

                                    color: '#475569',

                                    cursor: 'pointer'

                                }}

                            >

                                Cancel

                            </button>



                            <button

                                type="button"

                                onClick={handleConfirmDelete}

                                disabled={actionLoading}

                                style={{

                                    padding: '8px 18px',

                                    borderRadius: 8,

                                    border: 'none',

                                    background: '#dc2626',

                                    fontSize: 13,

                                    fontWeight: 700,

                                    color: '#fff',

                                    cursor: actionLoading ? 'not-allowed' : 'pointer',

                                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',

                                    display: 'inline-flex',

                                    alignItems: 'center',

                                    gap: 6

                                }}

                            >

                                {actionLoading ? (

                                    <>

                                        <BsArrowRepeat className="spin-anim" size={14} />

                                        <span>Deleting...</span>

                                    </>

                                ) : (

                                    <span>Yes, Delete</span>

                                )}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </PageContainer>

    );

};



export default Employees;
