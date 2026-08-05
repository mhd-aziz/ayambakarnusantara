// src/pages/CartPage.js

import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Spinner,
  Alert,
  Image,
  InputGroup,
  Form,
  ListGroup,
  Modal,
} from "../components/ui";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/OrderService";
import {
  Trash,
  PlusLg,
  DashLg,
  CartX,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { handleProductSmallImageError as handleImageError } from "../utils/imageFallback";

function CartPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const {
    cart,
    fetchCart,
    updateItemQuantity: updateCartItemQuantityContext,
    removeItem: removeCartItemContext,
    clearCartContext,
    isLoading: isCartLoading,
    error: cartError,
  } = useCart();

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearingCart, setIsClearingCart] = useState(false);

  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderError, setOrderError] = useState("");
  const [orderSuccessMessage, setOrderSuccessMessage] = useState("");

  useEffect(() => {}, [isLoggedIn, fetchCart]);

  const handleUpdateQuantity = async (productId, currentQuantity, change) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 0) return;

    if (newQuantity === 0) {
      handleRemoveItem(
        productId,
        "Mengurangi kuantitas menjadi 0 akan menghapus item ini. Lanjutkan?"
      );
      return;
    }

    setUpdatingItemId(productId);
    try {
      await updateCartItemQuantityContext(productId, newQuantity);
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat memperbarui kuantitas.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (
    productId,
    confirmMessage = "Anda yakin ingin menghapus item ini dari keranjang?"
  ) => {
    if (!window.confirm(confirmMessage)) return;
    setUpdatingItemId(productId);
    try {
      await removeCartItemContext(productId);
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat menghapus produk.");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleShowClearConfirmModal = () => setShowClearConfirmModal(true);
  const handleCloseClearConfirmModal = () => setShowClearConfirmModal(false);

  const handleActualClearCart = async () => {
    handleCloseClearConfirmModal();
    setIsClearingCart(true);
    try {
      await clearCartContext();
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat mengosongkan keranjang.");
    } finally {
      setIsClearingCart(false);
    }
  };


  const handleConfirmOrder = async () => {
    if (!cart || cart.items.length === 0) {
      setOrderError(
        "Keranjang Anda kosong. Silakan tambahkan produk terlebih dahulu."
      );
      return;
    }
    if (!paymentMethod) {
      setOrderError("Silakan pilih metode pembayaran terlebih dahulu.");
      return;
    }

    setIsCreatingOrder(true);
    setOrderError("");
    setOrderSuccessMessage("");
    let createdOrderId = null;

    try {
      const orderData = {
        paymentMethod,
        notes: orderNotes.trim(),
      };
      const response = await createOrder(orderData);

      if (
        response &&
        response.success &&
        response.data &&
        response.data.orderId
      ) {
        createdOrderId = response.data.orderId;
        setOrderSuccessMessage(
          response.message ||
            `Pesanan #${createdOrderId} berhasil dibuat! Anda akan diarahkan ke detail pesanan.`
        );

        setTimeout(async () => {
          try {
            await clearCartContext();
          } catch (clearError) {
            console.error(
              "Gagal membersihkan keranjang setelah order:",
              clearError
            );
          }
          if (createdOrderId) {
            navigate(`/pesanan/${createdOrderId}`);
          }
          setOrderSuccessMessage("");
        }, 3000);
      } else {
        if (
          response &&
          response.success &&
          !(response.data && response.data.orderId)
        ) {
          setOrderError(
            "Pesanan berhasil dibuat, tetapi ID pesanan tidak diterima. Hubungi support."
          );
          console.error("Order ID tidak ditemukan dalam respons:", response);
        } else {
          setOrderError(
            response?.message || "Gagal membuat pesanan. Respons tidak sesuai."
          );
        }
      }
    } catch (err) {
      console.error("Error saat membuat pesanan:", err);
      setOrderError(
        err.message || "Terjadi kesalahan pada server saat membuat pesanan."
      );
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (!isLoggedIn && !isCartLoading) {
    return (
      <Container className="text-center py-5">
        <Alert variant="warning">
          Silakan{" "}
          <Link to="/login" state={{ from: "/keranjang" }}>
            login
          </Link>{" "}
          untuk melihat keranjang Anda.
        </Alert>
      </Container>
    );
  }

  if (isCartLoading) {
    return (
      <Container className="text-center py-5 cart-loading-container">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-lg">Memuat Keranjang Anda...</p>
      </Container>
    );
  }

  if (cartError && !orderError && !orderSuccessMessage) {
    return (
      <Container className="text-center py-5">
        <Alert variant="danger" className="cart-error-alert">
          <Alert.Heading>Oops! Terjadi Kesalahan</Alert.Heading>
          <p>{cartError}</p>
          <Button
            onClick={fetchCart}
            variant="danger"
            className="btn-brand-retry"
          >
            Coba Lagi
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!cart || !cart.items) {
    return (
      <Container className="text-center py-5">
        <Alert variant="info" className="cart-empty-alert">
          <CartX size={48} className="mb-3 text-muted" />
          <Alert.Heading as="h4">Keranjang Tidak Dapat Dimuat</Alert.Heading>
          <p>
            Kami tidak dapat memuat keranjang Anda saat ini. Silakan coba lagi.
          </p>
          <div className="mt-3">
            <Button
              as={Link}
              to="/menu"
              variant="primary"
              className="me-2 btn-brand"
            >
              Lihat Menu
            </Button>
            <Button onClick={fetchCart} variant="outline-secondary">
              Muat Ulang Keranjang
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="my-4 cart-page-container">
      {orderSuccessMessage && (
        <Alert
          variant="success"
          onClose={() => setOrderSuccessMessage("")}
          dismissible
          className="fixed top-0 left-1/2 -translate-x-1/2 mt-3 z-index-toast"
          style={{ zIndex: 1055 }}
        >
          <CheckCircleFill className="me-2" />
          {orderSuccessMessage}
        </Alert>
      )}
      <h1 className="mb-4 cart-title">Keranjang Belanja Anda</h1>
      {cart.items.length === 0 ? (
        <Alert
          variant="light"
          className="text-center py-5 cart-empty-alert shadow-sm"
        >
          <CartX size={60} className="mb-3 text-primary" />
          <h3 className="text-primary">Keranjang Anda Kosong</h3>
          <p className="text-lg text-muted">
            Sepertinya Anda belum menambahkan produk apapun ke keranjang.
          </p>
          <Button
            as={Link}
            to="/menu"
            variant="primary"
            size="lg"
            className="mt-3 btn-brand"
          >
            Mulai Belanja
          </Button>
        </Alert>
      ) : (
        <Row>
          <Col lg={8} className="cart-items-column mb-4 lg:mb-0">
            <div className="flex justify-between items-center mb-3">
              <h4 className="mb-0">
                Produk di Keranjang (
                {cart.items.reduce((acc, item) => acc + item.quantity, 0)})
              </h4>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleShowClearConfirmModal}
                disabled={isClearingCart || cart.items.length === 0}
                className="btn-clear-cart"
              >
                {isClearingCart ? (
                  <Spinner as="span" animation="border" size="sm" />
                ) : (
                  <>
                    <Trash className="me-1" /> Kosongkan
                  </>
                )}
              </Button>
            </div>
            <ListGroup variant="flush" className="cart-item-list">
              {cart.items.map((item) => (
                <ListGroup.Item key={item.productId} className="cart-item">
                  <Row className="items-center gap-y-2">
                    <Col xs={3} sm={2} className="text-center">
                      <Image
                        src={
                          item.productImageURL ||
                          `https://placehold.co/80x80/EFEFEF/AAAAAA?text=${encodeURIComponent(
                            item.name
                          )}`
                        }
                        alt={item.name}
                        onError={(e) => handleImageError(e, item.name)}
                        className="cart-item-image"
                      />
                    </Col>
                    <Col xs={9} sm={4} className="cart-item-details">
                      <Link
                        to={`/menu/${item.productId}`}
                        className="cart-item-name no-underline font-semibold"
                      >
                        {item.name}
                      </Link>
                      {item.shopId && (
                        <div className="cart-item-shop">
                          <Link
                            to={`/toko/${item.shopId}`}
                            className="text-sm text-muted no-underline"
                          >
                            Toko: {item.shopName || "Kunjungi Toko"}
                          </Link>
                        </div>
                      )}
                      <div className="cart-item-price-single sm:hidden text-sm text-muted">
                        Rp {item.price.toLocaleString("id-ID")} / item
                      </div>
                    </Col>
                    <Col
                      xs={7}
                      sm={3}
                      className="mt-2 sm:mt-0 cart-item-quantity"
                    >
                      <InputGroup size="sm" className="quantity-input-group">
                        <Button
                          variant="outline-secondary"
                          className="quantity-btn"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.quantity,
                              -1
                            )
                          }
                          disabled={
                            updatingItemId === item.productId ||
                            item.quantity <= 0
                          }
                        >
                          <DashLg />
                        </Button>
                        <Form.Control
                          type="text"
                          value={item.quantity}
                          readOnly
                          className="text-center quantity-display"
                          aria-label={`Kuantitas untuk ${item.name}`}
                        />
                        <Button
                          variant="outline-secondary"
                          className="quantity-btn"
                          onClick={() =>
                            handleUpdateQuantity(
                              item.productId,
                              item.quantity,
                              1
                            )
                          }
                          disabled={updatingItemId === item.productId}
                        >
                          <PlusLg />
                        </Button>
                      </InputGroup>
                    </Col>
                    <Col
                      xs={3}
                      sm={2}
                      className="text-end cart-item-subtotal mt-2 sm:mt-0"
                    >
                      <span className="font-bold">
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </span>
                    </Col>
                    <Col
                      xs={2}
                      sm={1}
                      className="text-end cart-item-remove mt-2 sm:mt-0"
                    >
                      <Button
                        variant="link"
                        className="text-danger p-0"
                        onClick={() => handleRemoveItem(item.productId)}
                        disabled={updatingItemId === item.productId}
                        title="Hapus item"
                      >
                        {updatingItemId === item.productId ? (
                          <Spinner as="span" animation="border" size="sm" />
                        ) : (
                          <Trash size={20} />
                        )}
                      </Button>
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>

          <Col lg={4} className="cart-summary-column">
            <Card className="shadow-sm summary-card sticky top-0">
              <Card.Body>
                <Card.Title as="h3" className="mb-3 summary-title">
                  Ringkasan Pesanan
                </Card.Title>
                <ListGroup variant="flush" className="mb-3">
                  <ListGroup.Item className="flex justify-between px-0 summary-item">
                    <span>
                      Subtotal (
                      {cart.items.reduce((acc, item) => acc + item.quantity, 0)}{" "}
                      item)
                    </span>
                    <span>Rp {cart.totalPrice.toLocaleString("id-ID")}</span>
                  </ListGroup.Item>
                  <ListGroup.Item className="flex justify-between px-0 font-bold text-xl summary-total">
                    <span>Total</span>
                    <span>Rp {cart.totalPrice.toLocaleString("id-ID")}</span>
                  </ListGroup.Item>
                </ListGroup>

                <Form>
                  <Form.Group className="mb-3" controlId="paymentMethodCart">
                    <Form.Label className="font-semibold">
                      Metode Pembayaran
                    </Form.Label>
                    <Form.Select
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        if (
                          orderError ===
                          "Silakan pilih metode pembayaran terlebih dahulu."
                        ) {
                          setOrderError("");
                        }
                      }}
                      disabled={isCreatingOrder}
                      size="sm"
                    >
                      <option value="" disabled>
                        Pilih metode pembayaran...
                      </option>
                      <option value="PAY_AT_STORE">Bayar di Tempat</option>
                      <option value="ONLINE_PAYMENT">Pembayaran Online</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3" controlId="orderNotesCart">
                    <Form.Label className="font-semibold">
                      Catatan Tambahan (Opsional)
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder="Contoh: Tolong siapkan sebelum jam 5 sore."
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      disabled={isCreatingOrder}
                      size="sm"
                    />
                  </Form.Group>
                </Form>

                {orderError && (
                  <Alert variant="danger" className="mt-3">
                    {orderError}
                  </Alert>
                )}

                <Button
                  variant="primary"
                  className="w-full mt-3 btn-brand btn-checkout"
                  size="lg"
                  onClick={handleConfirmOrder}
                  disabled={
                    cart.items.length === 0 || isCreatingOrder || !paymentMethod
                  }
                >
                  {isCreatingOrder ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        className="me-2"
                      />
                      Memproses Pesanan...
                    </>
                  ) : (
                    "Konfirmasi Pesanan"
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      <Modal
        show={showClearConfirmModal}
        onHide={handleCloseClearConfirmModal}
        centered
      >
        <Modal.Header closeButton className="modal-header-danger">
          <Modal.Title>Konfirmasi Kosongkan Keranjang</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Anda yakin ingin mengosongkan seluruh isi keranjang belanja Anda?
          Tindakan ini tidak dapat diurungkan.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseClearConfirmModal}
            disabled={isClearingCart}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleActualClearCart}
            disabled={isClearingCart}
          >
            {isClearingCart ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                />
                Mengosongkan...
              </>
            ) : (
              "Ya, Kosongkan"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default CartPage;