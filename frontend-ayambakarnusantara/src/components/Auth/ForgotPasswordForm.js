import React, { useState } from "react";
import { Form, Button, Alert, Card, InputGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import { Envelope } from "react-bootstrap-icons";
import { forgotPassword as forgotPasswordService } from "../../services/AuthService";
import "../../css/AuthForms.css";

const ICON_COLOR = "#C07722";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    if (!email) {
      setError("Alamat email wajib diisi.");
      setLoading(false);
      return;
    }

    try {
      const response = await forgotPasswordService({ email });
      if (response.success) {
        setMessage(response.message);
        setEmail("");
      } else {
        setError(
          response.message || "Gagal mengirim permintaan reset password."
        );
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card border="light" className="p-2 p-sm-3 shadow-sm">
      <Card.Body>
        <h3 className="text-center mb-3 fw-bold" style={{ color: ICON_COLOR }}>
          Lupa Password?
        </h3>
        <p
          className="text-center text-muted mb-4 px-3"
          style={{ fontSize: "0.9rem" }}
        >
          Jangan khawatir! Masukkan alamat email Anda di bawah ini dan kami akan
          mengirimkan tautan untuk mengatur ulang password Anda.
        </p>

        {message && !error && (
          <Alert variant="success" className="text-center small py-2">
            {message}
          </Alert>
        )}
        {error && (
          <Alert variant="danger" className="text-center small py-2">
            {error}
          </Alert>
        )}

        {!message && (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="formForgotPasswordEmail">
              <Form.Label>Alamat Email Terdaftar</Form.Label>
              <InputGroup>
                <InputGroup.Text className="input-group-text-brand">
                  <Envelope color={ICON_COLOR} />
                </InputGroup.Text>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="contoh@email.com"
                  value={email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  autoFocus
                  className="form-control-brand-focus"
                />
              </InputGroup>
            </Form.Group>

            <Button
              type="submit"
              disabled={loading}
              className="w-100 fw-semibold py-2 mt-3 btn-brand"
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Mengirim...
                </>
              ) : (
                "Kirim Tautan Reset"
              )}
            </Button>
          </Form>
        )}

        <div className="mt-4 text-center">
          <small className="text-muted">Kembali ke</small>{" "}
          <Link to="/login" className="link-brand">
            Login
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

export default ForgotPasswordForm;
