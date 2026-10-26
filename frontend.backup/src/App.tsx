import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { ChatPage } from './pages/ChatPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EmptyState } from './components/ui/EmptyState';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/documents" replace />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/:documentId" element={<DocumentDetailPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route
          path="*"
          element={
            <div className="panel">
              <EmptyState
                icon={FileQuestion}
                title="Page not found"
                description="The page you are looking for does not exist."
                action={
                  <Link to="/documents" className="btn-secondary">
                    Go to documents
                  </Link>
                }
              />
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
