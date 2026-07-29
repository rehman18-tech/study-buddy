import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught UI Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error("Error clearing storage:", e);
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🦉</div>
          <h1 style={{ fontSize: '2rem', marginBottom: '10px', color: '#f87171' }}>
            Oops! Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '500px', marginBottom: '25px', lineHeight: '1.6' }}>
            StudyBuddy encountered an unexpected UI error. Don't worry, your data is safe! You can refresh or reset to continue.
          </p>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🔄 Refresh Page
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              🧹 Clear Storage & Restart
            </button>
          </div>
          {this.state.error && (
            <details style={{ marginTop: '30px', textAlign: 'left', maxWidth: '600px', width: '100%', backgroundColor: '#1e293b', padding: '15px', borderRadius: '8px' }}>
              <summary style={{ cursor: 'pointer', color: '#cbd5e1' }}>Error details</summary>
              <pre style={{ marginTop: '10px', color: '#f87171', fontSize: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
