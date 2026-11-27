import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getDashboardSummary } from '../services/dashboard';

const NotificationContext = createContext(null);

const MAX_HISTORY = 40;

const getCurrentUserKey = () => {
    try {
        const stored = localStorage.getItem('user');
        if (stored) {
            const user = JSON.parse(stored);
            if (user?.id) return `user_${user.id}`;
            if (user?.email) return `user_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
    } catch {
        // Fallback
    }
    return 'user_default';
};

const getStorageKeys = () => {
    const userKey = getCurrentUserKey();
    return {
        notifsKey: `retail_os_notifications_${userKey}`,
        readIdsKey: `retail_os_read_ids_${userKey}`
    };
};

const loadStoredNotifications = () => {
    try {
        const { notifsKey } = getStorageKeys();
        const raw = localStorage.getItem(notifsKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch {
        // Fallback
    }
    return [];
};

const loadStoredReadIds = () => {
    try {
        const { readIdsKey } = getStorageKeys();
        const raw = localStorage.getItem(readIdsKey);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return new Set(parsed);
        }
    } catch {
        // Fallback
    }
    return new Set();
};

const persistState = (notifications, readIdsSet) => {
    try {
        const { notifsKey, readIdsKey } = getStorageKeys();
        localStorage.setItem(notifsKey, JSON.stringify(notifications.slice(0, MAX_HISTORY)));
        localStorage.setItem(readIdsKey, JSON.stringify(Array.from(readIdsSet)));
    } catch (e) {
        console.warn('Failed to persist notification state:', e);
    }
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(loadStoredNotifications);
    const [readIds, setReadIds] = useState(loadStoredReadIds);
    const [lastInventoryAlert, setLastInventoryAlert] = useState(null);

    // Synchronize state when user logs in, logs out, or switches accounts
    useEffect(() => {
        const handleAuthChange = () => {
            setNotifications(loadStoredNotifications());
            setReadIds(loadStoredReadIds());
        };
        window.addEventListener('storage', handleAuthChange);
        window.addEventListener('retail-os:auth-change', handleAuthChange);
        return () => {
            window.removeEventListener('storage', handleAuthChange);
            window.removeEventListener('retail-os:auth-change', handleAuthChange);
        };
    }, []);

    // Helper to calculate unread count accurately
    const unreadCount = useMemo(() => {
        return notifications.filter(n => !n.isRead).length;
    }, [notifications]);

    // Save changes to localStorage whenever notifications or readIds change
    const saveState = useCallback((newNotifs, newReadIds) => {
        setNotifications(newNotifs);
        setReadIds(newReadIds);
        persistState(newNotifs, newReadIds);
    }, []);

    // ── Mark a specific notification as read ──
    const markAsRead = useCallback((notificationId) => {
        if (!notificationId) return;

        setReadIds(prevReadIds => {
            const updatedReadIds = new Set(prevReadIds);
            updatedReadIds.add(notificationId);

            setNotifications(prevNotifs => {
                const updatedNotifs = prevNotifs.map(item => {
                    if (item.id === notificationId) {
                        return {
                            ...item,
                            isRead: true,
                            readAt: new Date().toISOString()
                        };
                    }
                    return item;
                });
                persistState(updatedNotifs, updatedReadIds);
                return updatedNotifs;
            });

            return updatedReadIds;
        });

        // Dispatch state change event for real-time synchronization
        try {
            window.dispatchEvent(new CustomEvent('retail-os:notification-state-change', {
                detail: { action: 'mark_read', id: notificationId }
            }));
        } catch {
            // Ignore
        }
    }, []);

    // ── Mark all current notifications as read ──
    const markAllAsRead = useCallback(() => {
        setReadIds(prevReadIds => {
            const updatedReadIds = new Set(prevReadIds);

            setNotifications(prevNotifs => {
                const updatedNotifs = prevNotifs.map(item => {
                    updatedReadIds.add(item.id);
                    return {
                        ...item,
                        isRead: true,
                        readAt: item.readAt || new Date().toISOString()
                    };
                });
                persistState(updatedNotifs, updatedReadIds);
                return updatedNotifs;
            });

            return updatedReadIds;
        });

        try {
            window.dispatchEvent(new CustomEvent('retail-os:notification-state-change', {
                detail: { action: 'mark_all_read' }
            }));
        } catch {
            // Ignore
        }
    }, []);

    // ── Delete a specific notification ──
    const deleteNotification = useCallback((notificationId) => {
        setNotifications(prevNotifs => {
            const updatedNotifs = prevNotifs.filter(n => n.id !== notificationId);
            setReadIds(prevReadIds => {
                const updatedReadIds = new Set(prevReadIds);
                updatedReadIds.delete(notificationId);
                persistState(updatedNotifs, updatedReadIds);
                return updatedReadIds;
            });
            return updatedNotifs;
        });
    }, []);

    // ── Clear all read notifications from history ──
    const clearReadNotifications = useCallback(() => {
        setNotifications(prevNotifs => {
            const unreadOnly = prevNotifs.filter(n => !n.isRead);
            persistState(unreadOnly, readIds);
            return unreadOnly;
        });
    }, [readIds]);

    // ── Add new system/event notification ──
    const addNotification = useCallback((notif) => {
        if (!notif) return;

        const notifId = notif.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const timestamp = notif.timestamp || new Date().toISOString();

        setNotifications(prevNotifs => {
            // Check for exact duplicate within recent 5 items
            const isDuplicate = prevNotifs.slice(0, 5).some(
                item => item.id === notifId || (item.title === notif.title && item.message === notif.message && Math.abs(new Date(item.timestamp) - new Date(timestamp)) < 4000)
            );
            if (isDuplicate) return prevNotifs;

            const isAlreadyRead = readIds.has(notifId);
            const newItem = {
                id: notifId,
                title: notif.title || 'System Notification',
                message: notif.message || '',
                type: notif.type || 'info',
                time: notif.time || 'Just now',
                timestamp,
                isRead: isAlreadyRead,
                link: notif.link || null,
                linkText: notif.linkText || null,
            };

            const updated = [newItem, ...prevNotifs.filter(n => n.id !== notifId)].slice(0, MAX_HISTORY);
            persistState(updated, readIds);
            return updated;
        });
    }, [readIds]);

    // ── Listen to global window notification events ──
    useEffect(() => {
        const handleNewNotification = (e) => {
            if (e.detail) {
                addNotification(e.detail);
            }
        };

        const handleExternalStateChange = () => {
            setNotifications(loadStoredNotifications());
            setReadIds(loadStoredReadIds());
        };

        window.addEventListener('retail-os:notification', handleNewNotification);
        window.addEventListener('retail-os:notification-state-change', handleExternalStateChange);

        return () => {
            window.removeEventListener('retail-os:notification', handleNewNotification);
            window.removeEventListener('retail-os:notification-state-change', handleExternalStateChange);
        };
    }, [addNotification]);

    // ── Check real backend inventory status and generate low stock notification ──
    const syncBackendAlerts = useCallback(async () => {
        try {
            const summary = await getDashboardSummary();
            if (summary && typeof summary.low_stock_products === 'number') {
                const lowStockCount = summary.low_stock_products;

                if (lowStockCount > 0) {
                    // ID includes the low stock count so if inventory count changes, it creates a new unread alert
                    const alertId = `low-stock-alert-${lowStockCount}`;

                    setNotifications(prevNotifs => {
                        // Remove older low stock alerts that had different counts
                        const filtered = prevNotifs.filter(n => !n.id.startsWith('low-stock-alert'));
                        const isRead = readIds.has(alertId);

                        const alertItem = {
                            id: alertId,
                            type: 'warning',
                            title: 'Low Stock Alert',
                            message: `${lowStockCount} ${lowStockCount === 1 ? 'product is' : 'products are'} running low on inventory and need attention.`,
                            time: 'Requires Action',
                            timestamp: new Date().toISOString(),
                            isRead,
                            link: '/inventory',
                            linkText: 'View Inventory',
                        };

                        const updated = [alertItem, ...filtered].slice(0, MAX_HISTORY);
                        persistState(updated, readIds);
                        return updated;
                    });
                } else {
                    // Low stock resolved: remove alert from list
                    setNotifications(prevNotifs => {
                        const hasAlert = prevNotifs.some(n => n.id.startsWith('low-stock-alert'));
                        if (!hasAlert) return prevNotifs;
                        const filtered = prevNotifs.filter(n => !n.id.startsWith('low-stock-alert'));
                        persistState(filtered, readIds);
                        return filtered;
                    });
                }
            }
        } catch {
            // Silently ignore if backend summary fails or user unauthenticated
        }
    }, [readIds]);

    // Trigger backend alert sync periodically and on mount
    useEffect(() => {
        syncBackendAlerts();
        const interval = setInterval(syncBackendAlerts, 60000); // Check every 60 seconds
        return () => clearInterval(interval);
    }, [syncBackendAlerts]);

    const value = useMemo(() => ({
        notifications,
        unreadCount,
        unreadNotifications: notifications.filter(n => !n.isRead),
        readNotifications: notifications.filter(n => n.isRead),
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearReadNotifications,
        addNotification,
        syncBackendAlerts
    }), [notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearReadNotifications, addNotification, syncBackendAlerts]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
