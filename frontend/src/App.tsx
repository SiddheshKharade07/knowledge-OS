import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import SetPasswordPage from './pages/SetPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import EditUserPage from './pages/EditUserPage';
import DepartmentsPage from './pages/DepartmentsPage';
import ProfilePage from './pages/ProfilePage';
import { AdminRoute, ProtectedRoute, PublicOnlyRoute } from './components/auth/RouteGuards';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

/**
 * A data router is required for the chat navigation guard (`useBlocker`), which
 * makes sure an in-flight answer is never discarded silently.
 */
const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  { path: '/set-password', element: <SetPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/chat" replace /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'chat/:sessionId', element: <ChatPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      {
        path: 'admin/users',
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/users/:userId/edit',
        element: (
          <AdminRoute>
            <EditUserPage />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/departments',
        element: (
          <AdminRoute>
            <DepartmentsPage />
          </AdminRoute>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/chat" replace /> },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
