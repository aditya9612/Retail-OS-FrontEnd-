import React from 'react';
import { BsExclamationTriangleFill, BsArrowRepeat } from 'react-icons/bs';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    padding: 24,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        maxWidth: 580,
                        width: '100%',
                        background: '#ffffff',
                        border: '1px solid #fecaca',
                        borderRadius: 16,
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
                        padding: 32,
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: 56,
                            height: 56,
                            borderRadius: '50%',
                            background: '#fee2e2',
                            color: '#ef4444',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16
                        }}>
                            <BsExclamationTriangleFill size={28} />
                        </div>
                        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: '#1e293b', fontWeight: 700 }}>
                            Something went wrong
                        </h2>
                        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: 14 }}>
                            {this.state.error?.message || 'An unexpected rendering error occurred in this module.'}
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '10px 20px',
                                    background: '#4f46e5',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer'
                                }}
                            >
                                <BsArrowRepeat size={16} /> Reload Page
                            </button>
                            <button
                                onClick={() => { window.location.href = '/dashboard'; }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: 'pointer'
                                }}
                            >
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
