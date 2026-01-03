import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import './index.css'
import App from './App.tsx'
import { convex } from './lib/convex.ts'
import { wakeupBackend } from './lib/backendWakeup.ts'

function Root() {
  const [backendReady, setBackendReady] = useState(false);
  const [retryStatus, setRetryStatus] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    
    if (!apiUrl) {
      console.warn('VITE_API_URL not set, skipping backend wakeup');
      setBackendReady(true);
      return;
    }

    wakeupBackend(apiUrl, (attempt, maxRetries) => {
      if (attempt === 1) {
        setRetryStatus(`Waking up backend... (${attempt}/${maxRetries})`);
      } else {
        setRetryStatus(`Backend waking up, please wait... (${attempt}/${maxRetries})`);
      }
    }).then((success) => {
      if (success) {
        setRetryStatus('Backend ready!');
        setTimeout(() => setBackendReady(true), 500);
      } else {
        setError(true);
      }
    });
  }, []);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
          Backend Unavailable
        </div>
        <div style={{ color: '#6b7280' }}>
          Unable to connect to the backend server. Please try again later.
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!backendReady) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ fontSize: '1.125rem', color: '#374151' }}>
          {retryStatus || 'Initializing...'}
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />)
