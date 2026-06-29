import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        console.error('[MMOWS] React error', error, info);
    }
    render() {
        if (this.state.error) {
            return (_jsx("main", { className: "app-shell fantasy-shell", children: _jsx("section", { className: "screen-frame", children: _jsxs("section", { className: "panel hero-panel", children: [_jsx("div", { className: "section-title", children: "\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F" }), _jsx("h1", { children: "\u0418\u0433\u0440\u0430 \u043D\u0435 \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" }), _jsx("p", { className: "muted", children: this.state.error.message }), _jsx("div", { className: "action-grid", children: _jsx("button", { onClick: () => window.location.reload(), children: "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0432\u0440\u0443\u0447\u043D\u0443\u044E" }) })] }) }) }));
        }
        return this.props.children;
    }
}
