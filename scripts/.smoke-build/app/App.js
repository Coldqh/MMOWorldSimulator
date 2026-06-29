import { jsx as _jsx } from "react/jsx-runtime";
import { ErrorBoundary } from './ErrorBoundary.js';
import { AppShell } from '../ui/layout/AppShell.js';
export const App = () => (_jsx(ErrorBoundary, { children: _jsx(AppShell, {}) }));
