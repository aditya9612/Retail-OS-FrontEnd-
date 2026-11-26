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
const dispatchSystemNotification = (title, message, type = 'info') => {
    try {
        const event = new CustomEvent('retail-os:notification', {
            detail: {
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title,
                message: sanitizeMessage(message),
                type,
                timestamp: new Date().toISOString(),
                time: 'Just now',
            }
        });
        window.dispatchEvent(event);
    } catch {
        // Safe fallback in environments without window
    }
};

export const notificationService = {
    success: (message, title = 'Success') => {
        const cleanMsg = sanitizeMessage(message);
        toast.success(cleanMsg, {
            toastId: `success-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'success');
    },

    error: (message, title = 'Error') => {
        const cleanMsg = sanitizeMessage(message);
        toast.error(cleanMsg, {
            toastId: `error-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'error');
    },

    info: (message, title = 'Info') => {
        const cleanMsg = sanitizeMessage(message);
        toast.info(cleanMsg, {
            toastId: `info-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'info');
    },

    warning: (message, title = 'Warning') => {
        const cleanMsg = sanitizeMessage(message);
        toast.warn(cleanMsg, {
            toastId: `warn-${cleanMsg.slice(0, 30)}`,
        });
        dispatchSystemNotification(title, cleanMsg, 'warning');
    },

    sanitize: sanitizeMessage,
};

export default notificationService;

