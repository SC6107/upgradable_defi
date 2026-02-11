import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
/**
 * Catches React render errors and shows a fallback instead of blank screen.
 * Prevents "flash then blank" when something throws in the tree.
 */
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                hasError: false,
                error: null,
                errorInfo: null,
            }
        });
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        console.error('App error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError && this.state.error) {
            return (_jsx("div", { style: {
                    minHeight: '100vh',
                    background: 'linear-gradient(to bottom, #0f172a, #020617)',
                    color: '#e2e8f0',
                    padding: '2rem',
                    fontFamily: 'system-ui, sans-serif',
                }, children: _jsxs("div", { style: { maxWidth: '600px', margin: '0 auto' }, children: [_jsx("h1", { style: { fontSize: '1.5rem', marginBottom: '1rem', color: '#f87171' }, children: "Page load error" }), _jsx("p", { style: { marginBottom: '0.5rem' }, children: this.state.error.message }), this.state.errorInfo?.componentStack && (_jsx("pre", { style: {
                                marginTop: '1rem',
                                padding: '1rem',
                                background: '#1e293b',
                                borderRadius: '8px',
                                fontSize: '12px',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                            }, children: this.state.errorInfo.componentStack })), _jsx("p", { style: { marginTop: '1.5rem', fontSize: '0.875rem', color: '#94a3b8' }, children: "Open browser developer tools (F12) to view the full error in Console. If accessing from another device, ensure the backend API URL is correct (e.g. set VITE_API_URL to the actual backend address)." }), _jsx("button", { type: "button", onClick: () => this.setState({ hasError: false, error: null, errorInfo: null }), style: {
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                            }, children: "Retry" })] }) }));
        }
        return this.props.children;
    }
}
