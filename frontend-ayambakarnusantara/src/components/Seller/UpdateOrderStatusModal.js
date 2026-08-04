import React from "react";
import { Modal, Button, Form, Alert, Spinner, Badge } from "react-bootstrap";

function UpdateOrderStatusModal({
  show,
  onHide,
  orderToUpdate,
  newStatus,
  setNewStatus,
  onSubmit,
  isUpdating,
  error,
  getStatusBadgeVariant,
  getAvailableNextStatuses,
}) {
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

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="modal-header-primary">
        <Modal.Title>
          Update Status Pesanan #
          {orderToUpdate?.orderId ? orderToUpdate.orderId.substring(0, 8) : ""}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {orderToUpdate && (
          <p>
            Status saat ini:{" "}
            <Badge bg={getStatusBadgeVariant(orderToUpdate.orderStatus)}>
              {formatOrderStatus(orderToUpdate.orderStatus)}
            </Badge>
          </p>
        )}
        <Form.Group controlId="newOrderStatusModal">
          <Form.Label>Pilih Status Baru:</Form.Label>
          <Form.Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={isUpdating}
          >
            <option value="" disabled>
              Pilih status baru...
            </option>
            {orderToUpdate &&
              getAvailableNextStatuses(orderToUpdate.orderStatus).map(
                (statusOption) => (
                  <option key={statusOption} value={statusOption}>
                    {/* Menggunakan fungsi formatOrderStatus untuk menampilkan opsi status */}
                    {formatOrderStatus(statusOption)}
                  </option>
                )
              )}
          </Form.Select>
          {orderToUpdate &&
            getAvailableNextStatuses(orderToUpdate.orderStatus).length === 0 &&
            orderToUpdate?.orderStatus !== "COMPLETED" &&
            orderToUpdate?.orderStatus !== "CANCELLED" && (
              <Form.Text className="text-muted">
                Tidak ada transisi status berikutnya yang valid untuk status ini
                atau status sudah final.
              </Form.Text>
            )}
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={isUpdating}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          className="btn-brand"
          onClick={onSubmit}
          disabled={
            isUpdating ||
            !newStatus ||
            (orderToUpdate && newStatus === orderToUpdate.orderStatus)
          }
        >
          {isUpdating ? (
            <>
              <Spinner as="span" size="sm" className="me-2" />
              Memperbarui...
            </>
          ) : (
            "Update Status"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default UpdateOrderStatusModal;
