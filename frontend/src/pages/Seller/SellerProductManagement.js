import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Container,
  Alert,
  Button,
  Row,
  Spinner,
  Modal as BootstrapModal,
  Col,
} from "react-bootstrap";
import {
  InfoCircleFill,
  PlusCircleFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import CreateSellerForm from "../../components/Seller/CreateSellerForm";
import ProductListItem from "../../components/Seller/ProductListItem";
import ProductForm from "../../components/Seller/ProductForm";
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../services/MenuService";
import "../../css/SellerProductManagement.css";

function SellerProductManagement() {
  const outletContext = useOutletContext();
  const {
    userRole,
    shopData,
    hasShop,
    handleShopCreated,
    loadInitialData: loadSellerPageData,
  } = outletContext || {};

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [showProductModal, setShowProductModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formServerError, setFormServerError] = useState("");

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyStoreProducts = useCallback(async () => {
    if (!hasShop) {
      setProducts([]);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await getMyProducts();
      if (response && response.success && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
        if (response && response.success === false) {
          setError(response.message || "Gagal mengambil produk toko Anda.");
        } else {
          setError(
            "Format data produk tidak sesuai atau produk tidak ditemukan."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat mengambil produk Anda.");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasShop]);

  useEffect(() => {
    if (userRole === "seller" && hasShop) {
      fetchMyStoreProducts();
    }
  }, [userRole, hasShop, fetchMyStoreProducts]);

  const handleShowAddProductModal = () => {
    setProductToEdit(null);
    setFormServerError("");
    setSuccessMessage("");
    setShowProductModal(true);
  };

  const handleShowEditProductModal = (product) => {
    setProductToEdit(product);
    setFormServerError("");
    setSuccessMessage("");
    setShowProductModal(true);
  };

  const handleHideProductModal = () => {
    setShowProductModal(false);
    setProductToEdit(null);
    setFormServerError("");
  };

  const handleSubmitProduct = async (formData, productId) => {
    setIsSubmitting(true);
    setFormServerError("");
    setSuccessMessage("");
    try {
      let response;
      if (productId) {
        response = await updateProduct(productId, formData);
      } else {
        response = await createProduct(formData);
      }

      if (response.success) {
        setSuccessMessage(
          response.message ||
            (productId
              ? "Produk berhasil diperbarui!"
              : "Produk berhasil ditambahkan!")
        );
        fetchMyStoreProducts();
        setTimeout(() => {
          handleHideProductModal();
          setSuccessMessage("");
        }, 1500);
      } else {
        setFormServerError(
          response.message ||
            (productId
              ? "Gagal memperbarui produk."
              : "Gagal menambahkan produk.")
        );
      }
    } catch (err) {
      setFormServerError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirmModal = (id) => {
    setProductToDeleteId(id);
    setShowDeleteConfirmModal(true);
    setError("");
  };

  const closeDeleteConfirmModal = () => {
    setProductToDeleteId(null);
    setShowDeleteConfirmModal(false);
  };

  const handleDeleteProduct = async () => {
    if (!productToDeleteId) return;
    setIsDeleting(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await deleteProduct(productToDeleteId);
      if (response.success) {
        setSuccessMessage(response.message || "Produk berhasil dihapus.");
        fetchMyStoreProducts();
      } else {
        setError(response.message || "Gagal menghapus produk.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menghapus produk.");
    } finally {
      setIsDeleting(false);
      closeDeleteConfirmModal();
    }
  };

  if (!outletContext) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" style={{ color: "var(--brand-primary)" }} />
      </Container>
    );
  }

  if (userRole !== "seller" || !hasShop) {
    return (
      <Container className="py-4">
        <Alert variant="warning" className="mt-3 shadow-sm">
          <InfoCircleFill className="me-2" />
          Anda perlu memiliki toko untuk mengelola produk.
        </Alert>
        {(userRole === "customer" || (userRole === "seller" && !hasShop)) && (
          <Row className="justify-content-center mt-4">
            <Col md={10} lg={8}>
              <CreateSellerForm
                onShopCreated={() => {
                  if (handleShopCreated) handleShopCreated();
                  if (loadSellerPageData) loadSellerPageData();
                }}
              />
            </Col>
          </Row>
        )}
      </Container>
    );
  }

  return (
    <div className="seller-page-content product-management-page">
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2">
        <h3 className="mb-0">Kelola Produk Toko: {shopData?.shopName}</h3>
        <Button
          variant="primary"
          size="sm"
          onClick={handleShowAddProductModal}
          className="btn-brand"
        >
          <PlusCircleFill className="me-2" /> Tambah Produk Baru
        </Button>
      </div>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      {successMessage && !showProductModal && (
        <Alert
          variant="success"
          onClose={() => setSuccessMessage("")}
          dismissible
        >
          {successMessage}
        </Alert>
      )}

      {isLoading && (
        <div className="text-center py-5">
          <Spinner
            animation="border"
            style={{ color: "var(--brand-primary)" }}
          />
          <p className="mt-2 text-muted">Memuat produk Anda...</p>
        </div>
      )}

      {!isLoading && !error && products.length === 0 && (
        <Alert variant="info" className="text-center mt-3 shadow-sm">
          Belum ada produk di toko Anda. Silakan tambahkan produk baru.
        </Alert>
      )}

      {!isLoading && !error && products.length > 0 && (
        <Row className="mt-3">
          {products.map((product) => (
            <ProductListItem
              key={product._id || product.productId}
              product={product}
              onEdit={handleShowEditProductModal}
              onDelete={() =>
                openDeleteConfirmModal(product._id || product.productId)
              }
            />
          ))}
        </Row>
      )}

      <ProductForm
        show={showProductModal}
        onHide={handleHideProductModal}
        onSubmit={handleSubmitProduct}
        productToEdit={productToEdit}
        isLoading={isSubmitting}
        serverError={formServerError}
        serverSuccess={successMessage && showProductModal ? successMessage : ""}
      />

      <BootstrapModal
        show={showDeleteConfirmModal}
        onHide={closeDeleteConfirmModal}
        centered
        backdrop="static"
      >
        <BootstrapModal.Header
          closeButton={!isDeleting}
          className="modal-header-danger"
        >
          <BootstrapModal.Title>
            <ExclamationTriangleFill className="me-2" /> Konfirmasi Hapus Produk
          </BootstrapModal.Title>
        </BootstrapModal.Header>
        <BootstrapModal.Body>
          Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat
          diurungkan.
        </BootstrapModal.Body>
        <BootstrapModal.Footer>
          <Button
            variant="secondary"
            onClick={closeDeleteConfirmModal}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteProduct}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner as="span" size="sm" className="me-2" /> Menghapus...
              </>
            ) : (
              "Ya, Hapus Produk"
            )}
          </Button>
        </BootstrapModal.Footer>
      </BootstrapModal>
    </div>
  );
}

export default SellerProductManagement;
