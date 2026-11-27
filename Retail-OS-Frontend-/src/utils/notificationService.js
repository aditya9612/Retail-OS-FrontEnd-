import { toast } from 'react-toastify';

/**
 * Sanitizes notification message to ensure internal database IDs are not exposed.
 * Replaces patterns like "ID: 12", "#12", "(ID: 12)" with clean entity descriptions.
 */
const sanitizeMessage = (message) => {
    if (typeof message !== 'string') {
        if (message && typeof message === 'object') {
            return message.message || message.detail || JSON.stringify(message);
        }
        return String(message || '');
    }
    return message
        .replace(/\s*\(ID:\s*\d+\)/gi, '')
        .replace(/\s*\(Store ID:\s*\d+\)/gi, '')
        .replace(/\s*\(Target ID:\s*\d+\)/gi, '')
        .replace(/\s*\(Product ID:\s*\d+\)/gi, '')
        .replace(/\bID:\s*\d+\b/gi, '')
        .replace(/#\d+\b/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
};

/**
 * Dispatches an event for the in-app notification center / bell dropdown
 */
const dispatchSystemNotification = (title, message, type = 'info', options = {}) => {
    try {
        const event = new CustomEvent('retail-os:notification', {
            detail: {
                id: options.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title,
                message: sanitizeMessage(message),
                type,
                timestamp: new Date().toISOString(),
                time: 'Just now',
                link: options.link || null,
                linkText: options.linkText || null,
            }
        });
        window.dispatchEvent(event);
    } catch {
        // Safe fallback in environments without window
    }
};

export const notificationService = {
    success: (message, title = 'Success', options = {}) => {
        const cleanMsg = sanitizeMessage(message);
        toast.success(cleanMsg, {
            toastId: `success-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'success', options);
    },

    error: (message, title = 'Error', options = {}) => {
        const cleanMsg = sanitizeMessage(message);
        toast.error(cleanMsg, {
            toastId: `error-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'error', options);
    },

    info: (message, title = 'Info', options = {}) => {
        const cleanMsg = sanitizeMessage(message);
        toast.info(cleanMsg, {
            toastId: `info-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'info', options);
    },

    warning: (message, title = 'Warning', options = {}) => {
        const cleanMsg = sanitizeMessage(message);
        toast.warn(cleanMsg, {
            toastId: `warn-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'warning', options);
    },

    emit: (title, message, type = 'info', options = {}) => {
        dispatchSystemNotification(title, message, type, options);
    },

    sanitize: sanitizeMessage,
};

export default notificationService;

