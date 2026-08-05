import React, { useState } from "react";
import { Form, Button, Alert, Card, InputGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { loginUser } from "../../services/AuthService";
import { useAuth } from "../../context/AuthContext";
import { Envelope, Lock, Eye, EyeSlash } from "react-bootstrap-icons";
import "../../css/AuthForms.css";

const ICON_COLOR = "#C07722";

function LoginForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.email || !formData.password) {
      setError("Email dan password wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const apiResponse = await loginUser(formData);
      let userData = null;
      if (apiResponse && apiResponse.data && apiResponse.data.user) {
        userData = apiResponse.data.user;
      } else if (apiResponse && apiResponse.user) {
        userData = apiResponse.user;
      }

      const isSuccess =
        apiResponse &&
        (apiResponse.success === true || apiResponse.status === "success");

      if (isSuccess && userData) {
        login(userData, { navigateAfterLogin: true, navigateTo: "/" });
      } else {
        setError(
          apiResponse?.message ||
            "Login gagal. Periksa kembali kredensial Anda."
        );
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card border="light" className="p-2 p-sm-3 shadow-sm">
      <Card.Body>
        <h3 className="text-center mb-4 fw-bold" style={{ color: ICON_COLOR }}>
          Selamat Datang!
        </h3>
        {error && (
          <Alert variant="danger" className="text-center small py-2">
            {error}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formLoginEmail">
            <Form.Label>Alamat Email</Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand">
                <Envelope color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                type="email"
                name="email"
                placeholder="contoh@email.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                autoFocus
                className="form-control-brand-focus"
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formLoginPassword">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand">
                <Lock color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Masukkan password Anda"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="form-control-brand-focus"
              />
              <Button
                variant="outline-secondary"
                onClick={togglePasswordVisibility}
                title={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
                className="btn-toggle-password"
              >
                {showPassword ? <EyeSlash /> : <Eye />}
              </Button>
            </InputGroup>
          </Form.Group>

          <div className="d-flex justify-content-end mb-3">
            <Link
              to="/forgot-password"
              className="link-brand"
              style={{ fontSize: "0.9em" }}
            >
              Lupa Password?
            </Link>
          </div>

          <Button type="submit" disabled={loading} className="w-100 btn-brand">
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Memproses...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </Form>
        <div className="mt-4 text-center">
          <small className="text-muted">Belum punya akun?</small>{" "}
          <Link to="/register" className="link-brand">
            Daftar di sini
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

export default LoginForm;
