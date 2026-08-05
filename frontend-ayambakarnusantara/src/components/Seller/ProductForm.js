// src/components/Seller/ProductForm.js
import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Button,
  Spinner,
  Alert,
  Image,
  Row,
  Col,
} from "react-bootstrap";
import {
  XCircleFill,
  CheckCircleFill,
  Tag,
  CardText as DescIcon,
  CashCoin,
  BoxSeam,
  Image as ImageIcon,
} from "react-bootstrap-icons";

const ICON_COLOR = "#C07722"; 

const initialFormState = {
  name: "",
  description: "",
  price: "",
  stock: "",
  category: "Makanan",
  productImage: null,
  removeProductImage: false,
};

function ProductForm({
  show,
  onHide,
  onSubmit,
  productToEdit,
  isLoading,
  serverError,
  serverSuccess,
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [imagePreview, setImagePreview] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || "",
        description: productToEdit.description || "",
        price: productToEdit.price || "",
        stock: productToEdit.stock || "",
        category: productToEdit.category || "Makanan",
        productImage: null, // Reset file input
        removeProductImage: false,
      });
      setImagePreview(productToEdit.productImageURL || null);
    } else {
      setFormData(initialFormState);
      setImagePreview(null);
    }
    setFormErrors({});
  }, [productToEdit, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
      if (name === "removeProductImage" && checked) {
        setFormData((prev) => ({ ...prev, productImage: null }));
        setImagePreview(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({
        ...prev,
        productImage: file,
        removeProductImage: false,
      }));
      setImagePreview(URL.createObjectURL(file));
    } else {
      setFormData((prev) => ({ ...prev, productImage: null }));
      if (!productToEdit?.productImageURL) {
        setImagePreview(null);
      } else {
        setImagePreview(productToEdit.productImageURL);
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = "Nama produk wajib diisi.";
    if (!formData.description.trim())
      errors.description = "Deskripsi produk wajib diisi.";
    if (
      !formData.price ||
      isNaN(formData.price) ||
      Number(formData.price) <= 0
    ) {
      errors.price = "Harga produk harus angka positif.";
    }
    if (
      formData.stock === "" ||
      isNaN(formData.stock) ||
      Number(formData.stock) < 0
    ) {
      errors.stock = "Stok produk harus angka non-negatif.";
    }
    if (!formData.category) errors.category = "Kategori produk wajib dipilih.";
    if (!productToEdit && !formData.productImage) {
      errors.productImage = "Gambar produk wajib diunggah.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append("name", formData.name.trim());
    submitData.append("description", formData.description.trim());
    submitData.append("price", Number(formData.price));
    submitData.append("stock", Number(formData.stock));
    submitData.append("category", formData.category);

    if (formData.productImage) {
      submitData.append("productImage", formData.productImage);
    }
    if (productToEdit && formData.removeProductImage) {
      submitData.append("removeProductImage", "true");
    }

    onSubmit(
      submitData,
      productToEdit ? productToEdit._id || productToEdit.productId : null
    );
  };

  // PERUBAHAN: Mengganti URL placeholder dengan ui-avatars
  const currentImageSrc =
    imagePreview ||
    (productToEdit && !formData.removeProductImage
      ? productToEdit.productImageURL
      : null) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      formData.name || "Produk"
    )}&size=150&background=EFEFEF&color=AAAAAA`;

  return (
    <Modal
      show={show}
      onHide={onHide}
      backdrop="static"
      keyboard={false}
      centered
      size="lg"
    >
      <Modal.Header closeButton={!isLoading}>
        <Modal.Title>
          {productToEdit ? "Edit Produk" : "Tambah Produk Baru"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {serverError && (
          <Alert variant="danger" onClose={() => {}} dismissible>
            <XCircleFill className="me-2" />
            {serverError}
          </Alert>
        )}
        {serverSuccess && (
          <Alert variant="success">
            <CheckCircleFill className="me-2" />
            {serverSuccess}
          </Alert>
        )}

        <Form onSubmit={handleSubmit} id="productForm">
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3" controlId="productName">
                <Form.Label>
                  <Tag className="me-2" style={{ color: ICON_COLOR }} />
                  Nama Produk
                </Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  isInvalid={!!formErrors.name}
                  placeholder="Mis: Ayam Bakar Madu Spesial"
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.name}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="productDescription">
                <Form.Label>
                  <DescIcon className="me-2" style={{ color: ICON_COLOR }} />
                  Deskripsi
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  isInvalid={!!formErrors.description}
                  placeholder="Jelaskan tentang produk Anda..."
                  disabled={isLoading}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.description}
                </Form.Control.Feedback>
              </Form.Group>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="productPrice">
                    <Form.Label>
                      <CashCoin
                        className="me-2"
                        style={{ color: ICON_COLOR }}
                      />
                      Harga (Rp)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      isInvalid={!!formErrors.price}
                      placeholder="Contoh: 25000"
                      disabled={isLoading}
                      min="0"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.price}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3" controlId="productStock">
                    <Form.Label>
                      <BoxSeam className="me-2" style={{ color: ICON_COLOR }} />
                      Stok
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      isInvalid={!!formErrors.stock}
                      placeholder="Contoh: 100"
                      disabled={isLoading}
                      min="0"
                    />
                    <Form.Control.Feedback type="invalid">
                      {formErrors.stock}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3" controlId="productCategory">
                <Form.Label>Kategori</Form.Label>
                <Form.Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  isInvalid={!!formErrors.category}
                  disabled={isLoading}
                >
                  <option value="Makanan">Makanan</option>
                  <option value="Minuman">Minuman</option>
                  <option value="Camilan">Camilan</option>
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {formErrors.category}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex flex-column align-items-center">
              <Form.Label className="mb-2 w-100 text-center">
                <ImageIcon className="me-2" style={{ color: ICON_COLOR }} />
                Gambar Produk
              </Form.Label>
              <Image
                src={currentImageSrc}
                alt="Preview Gambar Produk"
                className="product-form-image-preview mb-2"
                fluid
              />
              <Form.Control
                type="file"
                name="productImageFile"
                accept="image/*"
                onChange={handleImageChange}
                isInvalid={!!formErrors.productImage}
                disabled={isLoading || formData.removeProductImage}
                className="form-control-sm mb-2"
              />
              <Form.Control.Feedback
                type="invalid"
                className="d-block text-center"
              >
                {formErrors.productImage}
              </Form.Control.Feedback>

              {productToEdit && productToEdit.productImageURL && (
                <Form.Check
                  type="checkbox"
                  id="removeProductImage"
                  name="removeProductImage"
                  label="Hapus Gambar Saat Ini"
                  checked={formData.removeProductImage}
                  onChange={handleChange}
                  disabled={isLoading || !!formData.productImage}
                  className="mt-2 form-check-sm"
                />
              )}
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={isLoading}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          type="submit"
          form="productForm"
          disabled={isLoading}
          className="btn-brand"
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Menyimpan...
            </>
          ) : productToEdit ? (
            "Simpan Perubahan"
          ) : (
            "Tambah Produk"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ProductForm;
