import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log untuk debugging; tidak bocorkan detail ke UI prod
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload ringan tanpa ubah rute bisnis; cukup reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: "0.5rem" }}>Terjadi kesalahan</h2>
          <p style={{ color: "#666", maxWidth: 480, marginBottom: "1.25rem" }}>
            Maaf, halaman mengalami gangguan. Coba muat ulang. Jika berlanjut,
            silakan kembali ke beranda.
          </p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={this.handleReset}
              className="btn btn-primary"
            >
              Muat Ulang
            </button>
            <a href="/" className="btn btn-outline-secondary">
              Ke Beranda
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
