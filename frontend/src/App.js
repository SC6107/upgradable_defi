import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MiningApp from './mining/App';
import LendingApp from './lending/App';
const appSwitcherBase = {
    position: 'fixed',
    top: '90px',
    right: '20px',
    zIndex: 10000,
    background: '#0f172a',
    borderRadius: '12px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
    border: '2px solid #334155',
    padding: '8px',
    backdropFilter: 'blur(10px)',
};
function AppSwitcher() {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;
    const isLending = path.startsWith('/lending');
    const isMining = path.startsWith('/mining');
    const btn = (to, active, label, activeColor) => (_jsx("button", { type: "button", onClick: () => navigate(to), style: {
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            background: active ? activeColor : '#1e293b',
            color: active ? 'white' : '#94a3b8',
            border: active ? `2px solid ${activeColor}` : '2px solid #334155',
        }, children: label }));
    return (_jsx("div", { style: appSwitcherBase, children: _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [btn('/lending/markets', isLending, '💰 Lending', '#2563eb'), btn('/mining/pools', isMining, '⛏️ Mining', '#9333ea')] }) }));
}
function App() {
    return (_jsxs("div", { className: "min-h-screen", children: [_jsx(AppSwitcher, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/lending/markets", replace: true }) }), _jsx(Route, { path: "/lending", element: _jsx(Navigate, { to: "/lending/markets", replace: true }) }), _jsx(Route, { path: "/lending/*", element: _jsx(LendingApp, {}) }), _jsx(Route, { path: "/mining", element: _jsx(Navigate, { to: "/mining/pools", replace: true }) }), _jsx(Route, { path: "/mining/*", element: _jsx(MiningApp, {}) })] })] }));
}
export default App;
