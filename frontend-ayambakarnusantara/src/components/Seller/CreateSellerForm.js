import React, { useState } from "react";
import {
  Form,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
  Image as BootstrapImage,
} from "react-bootstrap";
import {
  CardText,
  CardImage,
  CheckCircleFill,
  XCircleFill,
} from "react-bootstrap-icons";
import { createShop } from "../../services/ShopService";

const ICON_COLOR = "#C07722"; 

function CreateSellerForm({ onShopCreated }) {
  const [description, setDescription] = useState("");
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBannerImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setBannerImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const shopData = {
      description: description.trim(),
      bannerImage: bannerImageFile,
    };

    try {
      const response = await createShop(shopData);
      if (
        response &&
        (response.success === true || response.status === "success")
      ) {
        setSuccess(response.message || "Toko berhasil dibuat!");
        if (onShopCreated) {
          onShopCreated(response.data);
        }
        // Reset form
        setDescription("");
        setBannerImageFile(null);
        setImagePreview(null);
        // Jika input file di-reset dengan e.target.reset(), pastikan itu bekerja
        if (e.target.bannerImageInput) {
          // Beri id pada input file jika perlu
          e.target.bannerImageInput.value = null;
        }
      } else {
        setError(response?.message || "Gagal membuat toko.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat membuat toko.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      onSubmit={handleSubmit}
      className="p-4 border rounded shadow-sm bg-light"
    >
      <h3 className="mb-4 text-center" style={{ color: ICON_COLOR }}>
        Buka Toko Anda
      </h3>
      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          className="d-flex align-items-center"
        >
          <XCircleFill className="me-2" /> {error}
        </Alert>
      )}
      {success && (
        <Alert
          variant="success"
          onClose={() => setSuccess("")}
          dismissible
          className="d-flex align-items-center"
        >
          <CheckCircleFill className="me-2" /> {success}
        </Alert>
      )}

      <Form.Group as={Row} className="mb-3" controlId="shopDescription">
        <Form.Label column sm={3} className="text-sm-end">
          <CardText className="me-2" style={{ color: ICON_COLOR }} /> Deskripsi
          Toko
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            as="textarea"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Jelaskan tentang toko Anda..."
            required
            disabled={loading}
          />
          <Form.Text muted>
            Deskripsi akan membantu pelanggan mengenal toko Anda.
          </Form.Text>
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="bannerImageInput">
        <Form.Label column sm={3} className="text-sm-end">
          <CardImage className="me-2" style={{ color: ICON_COLOR }} /> Banner
          Toko
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
          />
          {imagePreview && (
            <BootstrapImage
              src={imagePreview}
              alt="Preview Banner"
              fluid
              thumbnail
              className="mt-3"
              style={{ maxHeight: "200px", objectFit: "cover" }}
            />
          )}
          <Form.Text muted>
            Banner opsional. Jika tidak diisi, foto profil Anda mungkin
            digunakan (jika ada).
          </Form.Text>
        </Col>
      </Form.Group>

      <Row className="mt-4">
        <Col sm={{ span: 9, offset: 3 }} className="d-grid">
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="btn-brand"
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Memproses...
              </>
            ) : (
              "Buat Toko Saya"
            )}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

export default CreateSellerForm;
