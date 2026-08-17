import React, { useEffect, useState } from "react";
import {
  Form,
  Button,
  Alert,
  Card,
  InputGroup,
  Spinner,
} from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { Lock } from "react-bootstrap-icons";
import { resetPassword } from "../services/AuthService";
import "../css/AuthForms.css";

const ICON_COLOR = "#C07722";

// Supabase mengirim link recovery dalam bentuk:
//   /reset-password#access_token=...&refresh_token=...&type=recovery
// Fungsi ini mengekstrak token dari hash URL.
function parseRecoveryTokenFromHash() {
  const hash = window.location.hash || "";
  if (!hash.startsWith("#")) return { accessToken: null, refreshToken: null };
  const params = new URLSearchParams(hash.slice(1));
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
  };
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isTokenReady, setIsTokenReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { accessToken, refreshToken } = parseRecoveryTokenFromHash();
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsTokenReady(true);
  }, []);

  if (!isTokenReady) {
    return (
      <div className="d-flex justify-content-center align-items-center auth-form-wrapper">
        <Spinner animation="border" variant="warning" />
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("Password baru dan konfirmasi wajib diisi.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await resetPassword({
        accessToken,
        refreshToken,
        newPassword,
      });
      if (response.success) {
        setMessage(response.message);
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => navigate("/login", { replace: true }), 2000);
      } else {
        setError(response.message || "Gagal mengatur ulang password.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-form-wrapper">
      <Card border="light" className="p-2 p-sm-3 shadow-sm">
        <Card.Body>
          <h3 className="text-center mb-3 fw-bold" style={{ color: ICON_COLOR }}>
            Atur Ulang Password
          </h3>

          {!accessToken || !refreshToken ? (
            <>
              <p className="text-center text-muted mb-4 px-3">
                Tautan yang Anda buka tidak valid atau sudah kedaluwarsa.
              </p>
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="btn btn-brand fw-semibold"
                >
                  Minta Tautan Baru
                </Link>
              </div>
              <div className="mt-3 text-center">
                <small className="text-muted">Atau</small>{" "}
                <Link to="/login" className="link-brand">
                  Kembali ke Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-center text-muted mb-4 px-3">
                Masukkan password baru untuk akun Anda.
              </p>

              {message && (
                <Alert variant="success" className="text-center small py-2">
                  {message}
                </Alert>
              )}
              {error && (
                <Alert variant="danger" className="text-center small py-2">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formNewPassword">
                  <Form.Label>Password Baru</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="input-group-text-brand">
                      <Lock color={ICON_COLOR} />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="newPassword"
                      placeholder="Minimal 6 karakter"
                      value={newPassword}
                      onChange={(ev) => setNewPassword(ev.target.value)}
                      disabled={loading}
                      autoFocus
                      className="form-control-brand-focus"
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3" controlId="npConfirmPassword">
                  <Form.Label>Konfirmasi Password Baru</Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="input-group-text-brand">
                      <Lock color={ICON_COLOR} />
                    </InputGroup.Text>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(ev) => setConfirmPassword(ev.target.value)}
                      disabled={loading}
                      className="form-control-brand-focus"
                    />
                  </InputGroup>
                </Form.Group>

                <Form.Check
                  type="checkbox"
                  label="Tampilkan password"
                  checked={showPassword}
                  onChange={(ev) => setShowPassword(ev.target.checked)}
                  className="mb-3"
                />

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-100 fw-semibold py-2 mt-1 btn-brand"
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Password Baru"
                  )}
                </Button>
              </Form>

              <div className="mt-4 text-center">
                <small className="text-muted">Sudah mengingat password?</small>{" "}
                <Link to="/login" className="link-brand">
                  Login
                </Link>
              </div>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default ResetPasswordPage;