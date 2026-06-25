import { ErrorBoundary } from './ErrorBoundary';
import { AppShell } from '../ui/layout/AppShell';

export const App = () => (
  <ErrorBoundary>
    <AppShell />
  </ErrorBoundary>
);
