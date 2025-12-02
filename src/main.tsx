import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "#dc2626" }}>
            ⚠️ Configuration Error
          </h1>
          <div
            style={{
              maxWidth: "600px",
              padding: "1.5rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: "#f9fafb",
            }}
          >
            <p style={{ marginBottom: "1rem", color: "#374151" }}>
              {this.state.error?.message || "An error occurred"}
            </p>
            <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#fef3c7", borderRadius: "4px" }}>
              <p style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Quick Fix:</p>
              <ol style={{ marginLeft: "1.5rem", lineHeight: "1.8" }}>
                <li>Create a <code style={{ backgroundColor: "#e5e7eb", padding: "2px 6px", borderRadius: "3px" }}>.env</code> file in your project root</li>
                <li>Add your Supabase credentials:
                  <pre style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "#1f2937", color: "#f9fafb", borderRadius: "4px", fontSize: "0.875rem", overflow: "auto" }}>
{`VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here`}
                  </pre>
                </li>
                <li>Get your credentials from <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "underline" }}>Supabase Dashboard</a> → Settings → API</li>
                <li>Restart your dev server</li>
              </ol>
              <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                See <code style={{ backgroundColor: "#e5e7eb", padding: "2px 6px", borderRadius: "3px" }}>QUICK_START_SUPABASE.md</code> for detailed instructions.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
