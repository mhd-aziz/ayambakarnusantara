import React, { useState } from "react";
import { Form, Button, Alert, Card, InputGroup } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/AuthService";
import { useAuth } from "../../context/AuthContext";
import {
  Person,
  Envelope,
  Lock,
  Eye,
  EyeSlash,
  Telephone,
  House,
} from "react-bootstrap-icons";
import "../../css/AuthForms.css";

const ICON_COLOR = "#C07722";

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    phoneNumber: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!formData.email || !formData.password || !formData.displayName) {
      setError("Email, password, dan nama lengkap wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const apiResponse = await registerUser(formData);

      let userDataForLogin = null;
      if (apiResponse.data && apiResponse.data.user) {
        userDataForLogin = apiResponse.data.user;
      } else if (apiResponse.user) {
        userDataForLogin = apiResponse.user;
      }

      if (apiResponse.success && userDataForLogin) {
        setSuccess(
          apiResponse.message ||
            "Registrasi berhasil! Anda akan login secara otomatis."
        );
        setTimeout(() => {
          login(userDataForLogin);
        }, 1500);
      } else if (apiResponse.success && !userDataForLogin) {
        setSuccess(
          apiResponse.message ||
            "Registrasi berhasil. Silakan ikuti langkah selanjutnya."
        );
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(
          apiResponse.message || "Pendaftaran gagal. Silakan coba lagi."
        );
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mendaftar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card border="light" className="p-2 p-sm-3 shadow-sm">
      <Card.Body>
        <h3 className="text-center mb-4 fw-bold" style={{ color: ICON_COLOR }}>
          Buat Akun Baru
        </h3>
        {error && (
          <Alert variant="danger" className="text-center small py-2">
            {error}
          </Alert>
        )}
        {success && !error && (
          <Alert variant="success" className="text-center small py-2">
            {success}
          </Alert>
        )}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formRegisterDisplayName">
            <Form.Label>Nama Lengkap</Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand">
                <Person color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                name="displayName"
                placeholder="Masukkan nama lengkap Anda"
                value={formData.displayName}
                onChange={handleChange}
                required
                disabled={loading}
                autoFocus
                className="form-control-brand-focus"
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRegisterEmail">
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
                className="form-control-brand-focus"
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRegisterPassword">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand">
                <Lock color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Buat password yang kuat"
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

          <Form.Group className="mb-3" controlId="formRegisterPhoneNumber">
            <Form.Label>
              Nomor Telepon
            </Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand">
                <Telephone color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                type="tel"
                name="phoneNumber"
                placeholder="Contoh: +6281234567890"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
                className="form-control-brand-focus"
              />
            </InputGroup>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formRegisterAddress">
            <Form.Label>
              Alamat
            </Form.Label>
            <InputGroup>
              <InputGroup.Text className="input-group-text-brand input-group-text-brand-textarea">
                <House color={ICON_COLOR} />
              </InputGroup.Text>
              <Form.Control
                as="textarea"
                rows={2}
                name="address"
                placeholder="Masukkan alamat lengkap Anda"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
                className="form-control-brand-focus"
              />
            </InputGroup>
          </Form.Group>

          <Button
            type="submit"
            disabled={loading || (success && !error)}
            className="w-100 btn-brand"
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Mendaftar...
              </>
            ) : (
              "Register"
            )}
          </Button>
        </Form>
        <div className="mt-4 text-center">
          <small className="text-muted">Sudah punya akun?</small>{" "}
          <Link to="/login" className="link-brand">
            Login di sini
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

export default RegisterForm;
