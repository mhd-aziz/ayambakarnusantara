import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Container,
  Alert,
  Card,
  Row,
  Col,
  Spinner,
  Button,
  Form,
  InputGroup,
  Pagination,
} from "react-bootstrap";
import {
  InfoCircleFill,
  Search as SearchIcon,
  ArrowClockwise,
} from "react-bootstrap-icons";

import CreateSellerForm from "../../components/Seller/CreateSellerForm";
import SellerOrderList from "../../components/Seller/SellerOrderList";
import SellerOrderDetailModal from "../../components/Seller/SellerOrderDetailModal";
import UpdateOrderStatusModal from "../../components/Seller/UpdateOrderStatusModal";
import ConfirmPaymentModal from "../../components/Seller/ConfirmPaymentModal";
import ViewPaymentProofsModal from "../../components/Seller/ViewPaymentProofsModal";

import {
  getSellerOrders,
  getSellerOrderDetailById,
  updateOrderStatusBySeller,
} from "../../services/OrderService";
import "../../css/SellerOrderManagement.css";

const ORDERS_PER_PAGE = 15;

function SellerOrderManagement() {
  const outletContext = useOutletContext();
  const {
    userRole,
    shopData,
    hasShop,
    handleShopCreated,
    loadInitialData: loadSellerPageData,
  } = outletContext || {};

  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedOrderData, setSelectedOrderData] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [orderToUpdate, setOrderToUpdate] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState("");

  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [orderToConfirmPayment, setOrderToConfirmPayment] = useState(null);

  const [showViewProofsModal, setShowViewProofsModal] = useState(false);
  const [orderIdForProofs, setOrderIdForProofs] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const nextStatusMap = {
    PENDING_CONFIRMATION: "CONFIRMED",
    CONFIRMED: "PROCESSING",
    PROCESSING: "READY_FOR_PICKUP",
    READY_FOR_PICKUP: "COMPLETED",
  };

  const validSellerUpdateStatuses = [
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CONFIRMED",
  ];

  const formatOrderStatus = (status) => {
    const statusMap = {
      PENDING_CONFIRMATION: "Menunggu Konfirmasi",
      AWAITING_PAYMENT: "Menunggu Pembayaran",
      CONFIRMED: "Dikonfirmasi",
      PROCESSING: "Sedang Diproses",
      READY_FOR_PICKUP: "Siap Diambil",
      COMPLETED: "Selesai",
      CANCELLED: "Dibatalkan",
    };
    return statusMap[status] || status.replace(/_/g, " ");
  };

  const fetchOrdersForSeller = useCallback(async () => {
    if (!hasShop) {
      setAllOrders([]);
      return;
    }
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const response = await getSellerOrders();
      if (response && response.success && Array.isArray(response.data)) {
        setAllOrders(response.data);
      } else {
        setAllOrders([]);
        setError(
          response?.message || "Gagal mengambil daftar pesanan untuk toko Anda."
        );
      }
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan saat mengambil pesanan toko Anda."
      );
      setAllOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [hasShop]);

  useEffect(() => {
    if (userRole === "seller" && hasShop) {
      fetchOrdersForSeller();
    }
  }, [userRole, hasShop, fetchOrdersForSeller]);

  useEffect(() => {
    let currentOrders = [...allOrders];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentOrders = currentOrders.filter(
        (order) =>
          order.orderId.toLowerCase().includes(lowerSearchTerm) ||
          order.userId.toLowerCase().includes(lowerSearchTerm) ||
          (order.customerDetails?.displayName &&
            order.customerDetails.displayName
              .toLowerCase()
              .includes(lowerSearchTerm)) ||
          (order.customerDetails?.email &&
            order.customerDetails.email
              .toLowerCase()
              .includes(lowerSearchTerm)) ||
          order.items.some((item) =>
            item.name.toLowerCase().includes(lowerSearchTerm)
          )
      );
    }

    if (statusFilter !== "ALL") {
      currentOrders = currentOrders.filter(
        (order) => order.orderStatus === statusFilter
      );
    }
    setFilteredOrders(currentOrders);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, allOrders]);

  const handleShowDetailModal = async (orderId) => {
    setShowDetailModal(true);
    setIsLoadingDetail(true);
    setDetailError("");
    setSelectedOrderData(null);
    try {
      const response = await getSellerOrderDetailById(orderId);
      if (response && response.success && response.data) {
        setSelectedOrderData(response.data);
      } else {
        setDetailError(response?.message || "Gagal mengambil detail pesanan.");
      }
    } catch (err) {
      setDetailError(
        err.message || "Terjadi kesalahan server saat mengambil detail pesanan."
      );
    } finally {
      setIsLoadingDetail(false);
    }
  };
  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedOrderData(null);
  };

  const handleShowUpdateStatusModal = (order) => {
    setOrderToUpdate(order);
    const primaryNextStatus = nextStatusMap[order.orderStatus];
    if (order.orderStatus === "PENDING_CONFIRMATION") {
      setNewStatus("CONFIRMED");
    } else if (primaryNextStatus) {
      setNewStatus(primaryNextStatus);
    } else {
      setNewStatus("");
    }
    setUpdateStatusError("");
    setShowUpdateStatusModal(true);
  };

  const handleCloseUpdateStatusModal = () => {
    setShowUpdateStatusModal(false);
    setOrderToUpdate(null);
    setNewStatus("");
    setUpdateStatusError("");
  };

  const handleUpdateStatusSubmit = async () => {
    if (!orderToUpdate || !newStatus) {
      setUpdateStatusError("Order ID atau status baru tidak valid.");
      return;
    }
    if (!validSellerUpdateStatuses.includes(newStatus)) {
      setUpdateStatusError(
        `Status "${newStatus}" tidak valid untuk diupdate oleh seller. Pilih dari: ${validSellerUpdateStatuses.join(
          ", "
        )}`
      );
      return;
    }
    setIsUpdatingStatus(true);
    setUpdateStatusError("");
    setSuccessMessage("");
    try {
      const response = await updateOrderStatusBySeller(
        orderToUpdate.orderId,
        newStatus
      );
      if (response && response.success) {
        setSuccessMessage(
          response.message || "Status pesanan berhasil diperbarui."
        );
        fetchOrdersForSeller();
        handleCloseUpdateStatusModal();
      } else {
        setUpdateStatusError(
          response?.message || "Gagal memperbarui status pesanan."
        );
      }
    } catch (err) {
      setUpdateStatusError(
        err.message ||
          "Terjadi kesalahan server saat memperbarui status pesanan."
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleShowConfirmPaymentModal = (order) => {
    setOrderToConfirmPayment(order);
    setShowConfirmPaymentModal(true);
  };
  const handleCloseConfirmPaymentModal = () => {
    setShowConfirmPaymentModal(false);
    setOrderToConfirmPayment(null);
  };
  const handlePaymentConfirmed = (updatedOrderData) => {
    setSuccessMessage("Pembayaran berhasil dikonfirmasi.");
    fetchOrdersForSeller();
  };

  const handleShowViewProofsModal = (orderId) => {
    setOrderIdForProofs(orderId);
    setShowViewProofsModal(true);
  };
  const handleCloseViewProofsModal = () => {
    setShowViewProofsModal(false);
    setOrderIdForProofs(null);
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("ALL");
    setCurrentPage(1);
    fetchOrdersForSeller();
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "PENDING_CONFIRMATION":
      case "AWAITING_PAYMENT":
        return "warning";
      case "CONFIRMED":
        return "info";
      case "PROCESSING":
        return "primary";
      case "READY_FOR_PICKUP":
        return "success";
      case "COMPLETED":
        return "dark";
      case "CANCELLED":
        return "danger";
      default:
        return "secondary";
    }
  };

  const getAvailableNextStatuses = (currentStatus) => {
    if (currentStatus === "PENDING_CONFIRMATION") {
      return ["CONFIRMED", "PROCESSING"];
    }
    if (nextStatusMap[currentStatus]) {
      return [nextStatusMap[currentStatus]];
    }
    return [];
  };

  const indexOfLastOrder = currentPage * ORDERS_PER_PAGE;
  const indexOfFirstOrder = indexOfLastOrder - ORDERS_PER_PAGE;
  const currentDisplayOrders = filteredOrders.slice(
    indexOfFirstOrder,
    indexOfLastOrder
  );
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const orderStatusOptions = [
    "ALL",
    "PENDING_CONFIRMATION",
    "AWAITING_PAYMENT",
    "CONFIRMED",
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CANCELLED",
  ];

  if (!outletContext) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" style={{ color: "var(--brand-primary)" }} />
      </Container>
    );
  }

  if (userRole !== "seller" || !hasShop) {
    return (
      <Container className="seller-page-content">
        <Alert variant="warning" className="mt-3 shadow-sm text-center">
          <InfoCircleFill className="me-2" />
          Anda perlu memiliki toko untuk mengelola pesanan.
        </Alert>
        {(userRole === "customer" || (userRole === "seller" && !hasShop)) && (
          <Row className="justify-content-center mt-4">
            <Col md={10} lg={8} className="seller-form">
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
    <div className="seller-page-content order-management-page">
      <div className="seller-page-header">
        <h3 className="seller-page-title mb-0">
          Kelola Pesanan Toko: {shopData?.shopName}
        </h3>
      </div>

      <Form className="mb-3 px-1">
        <Row className="g-2 align-items-end">
          <Col xs={12} md={6} lg={7}>
            <Form.Group controlId="orderSearchSeller">
              <Form.Label visuallyHidden>Cari Pesanan</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <SearchIcon />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Cari ID, Nama/Email Pelanggan, Produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Form.Group>
          </Col>
          <Col xs={8} md={4} lg={3}>
            <Form.Group controlId="statusFilterSeller">
              <Form.Label visuallyHidden>Filter Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                {orderStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL"
                      ? "Semua Status"
                      : formatOrderStatus(status)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={4} md={2} lg={2}>
            <Button
              variant="outline-secondary"
              onClick={handleResetFilters}
              className="w-100"
              title="Reset Filter"
            >
              <ArrowClockwise />
              <span className="d-none d-lg-inline ms-1">Reset</span>
            </Button>
          </Col>
        </Row>
      </Form>

      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      {successMessage && (
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
          <p className="mt-2 text-muted">Memuat pesanan...</p>
        </div>
      )}

      {!isLoading &&
        !error &&
        allOrders.length === 0 &&
        !searchTerm &&
        statusFilter === "ALL" && (
          <Card className="shadow-sm">
            <Card.Body className="text-center py-5">
              <InfoCircleFill size={40} className="text-muted mb-3" />
              <Card.Title as="h4">Belum Ada Pesanan</Card.Title>
              <Card.Text className="text-muted">
                Saat ini belum ada pesanan yang masuk ke toko Anda.
              </Card.Text>
            </Card.Body>
          </Card>
        )}

      {!isLoading &&
        !error &&
        allOrders.length > 0 &&
        filteredOrders.length === 0 && (
          <Alert variant="info" className="text-center mt-3">
            Tidak ada pesanan yang cocok dengan kriteria pencarian/filter Anda.
          </Alert>
        )}

      {!isLoading && !error && filteredOrders.length > 0 && (
        <>
          <SellerOrderList
            orders={currentDisplayOrders}
            onShowDetailModal={handleShowDetailModal}
            onShowUpdateStatusModal={handleShowUpdateStatusModal}
            onShowConfirmPaymentModal={handleShowConfirmPaymentModal}
            onShowViewProofsModal={handleShowViewProofsModal}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getAvailableNextStatuses={getAvailableNextStatuses}
          />
          {totalPages > 1 && (
            <Pagination className="justify-content-center mt-4 order-pagination">
              <Pagination.First
                onClick={() => paginate(1)}
                disabled={currentPage === 1}
              />
              <Pagination.Prev
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
              />
              {[...Array(totalPages).keys()].map((number) => {
                const pageNumber = number + 1;
                const MAX_PAGES_AROUND_CURRENT = 2;
                const MAX_PAGES_EDGES = 1;

                if (
                  totalPages <= 7 ||
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - MAX_PAGES_AROUND_CURRENT &&
                    pageNumber <= currentPage + MAX_PAGES_AROUND_CURRENT)
                ) {
                  return (
                    <Pagination.Item
                      key={pageNumber}
                      active={pageNumber === currentPage}
                      onClick={() => paginate(pageNumber)}
                    >
                      {pageNumber}
                    </Pagination.Item>
                  );
                }
                if (
                  (pageNumber === 2 &&
                    currentPage - MAX_PAGES_AROUND_CURRENT >
                      MAX_PAGES_EDGES + 1) ||
                  (pageNumber === totalPages - 1 &&
                    currentPage + MAX_PAGES_AROUND_CURRENT <
                      totalPages - MAX_PAGES_EDGES)
                ) {
                  return (
                    <Pagination.Ellipsis
                      key={`ellipsis-${pageNumber}`}
                      disabled
                    />
                  );
                }
                return null;
              })}
              <Pagination.Next
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
              />
              <Pagination.Last
                onClick={() => paginate(totalPages)}
                disabled={currentPage === totalPages}
              />
            </Pagination>
          )}
        </>
      )}

      <SellerOrderDetailModal
        show={showDetailModal}
        onHide={handleCloseDetailModal}
        orderData={selectedOrderData}
        isLoading={isLoadingDetail}
        error={detailError}
        getStatusBadgeVariant={getStatusBadgeVariant}
      />

      <UpdateOrderStatusModal
        show={showUpdateStatusModal}
        onHide={handleCloseUpdateStatusModal}
        orderToUpdate={orderToUpdate}
        newStatus={newStatus}
        setNewStatus={setNewStatus}
        onSubmit={handleUpdateStatusSubmit}
        isUpdating={isUpdatingStatus}
        error={updateStatusError}
        getStatusBadgeVariant={getStatusBadgeVariant}
        getAvailableNextStatuses={getAvailableNextStatuses}
      />

      <ConfirmPaymentModal
        show={showConfirmPaymentModal}
        onHide={handleCloseConfirmPaymentModal}
        order={orderToConfirmPayment}
        onPaymentConfirmed={handlePaymentConfirmed}
      />

      <ViewPaymentProofsModal
        show={showViewProofsModal}
        onHide={handleCloseViewProofsModal}
        orderId={orderIdForProofs}
      />
    </div>
  );
}

export default SellerOrderManagement;
