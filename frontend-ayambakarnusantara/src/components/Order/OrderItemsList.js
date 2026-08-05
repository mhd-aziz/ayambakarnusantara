import React from "react";
import { Link } from "react-router-dom";
import { Card, ListGroup, Image, Button } from "react-bootstrap";
import { ListTask } from "react-bootstrap-icons";

const ICON_COLOR = "#C07722";

function OrderItemsList({
  items,
  shopDetails,
  orderStatus,
  onShowRatingModal,
  handleImageError,
}) {
  return (
    <Card className="shadow-sm mb-4">
      <Card.Header as="h5">
        <ListTask color={ICON_COLOR} className="me-2" />
        Item Pesanan
      </Card.Header>
      <ListGroup variant="flush">
        {items?.map((item) => (
          <ListGroup.Item
            key={item.productId}
            className="d-flex align-items-center"
          >
            <Image
              src={
                item.productImageURL ||
                `https://placehold.co/60x60/EFEFEF/AAAAAA?text=${encodeURIComponent(
                  item.name
                )}`
              }
              onError={(e) => handleImageError(e, item.name)}
              alt={item.name}
              style={{
                width: "60px",
                height: "60px",
                objectFit: "cover",
                marginRight: "15px",
                borderRadius: "0.25rem",
              }}
            />
            <div className="flex-grow-1">
              <h6 className="mb-0">{item.name}</h6>
              <small className="text-muted">
                {item.quantity} x Rp {item.price.toLocaleString("id-ID")}
                {item.shopId && (
                  <>
                    {" "}
                    dari{" "}
                    <Link
                      to={`/toko/${item.shopId}`}
                      className="link-brand-color"
                    >
                      {shopDetails?.shopName ||
                        item.shopName ||
                        `ID Toko: ${item.shopId.substring(0, 6)}...`}
                    </Link>
                  </>
                )}
              </small>
            </div>
            <div className="text-end fw-semibold me-3">
              Rp {item.subtotal.toLocaleString("id-ID")}
            </div>
            {orderStatus === "COMPLETED" && (
              <Button
                className="btn-outline-brand"
                size="sm"
                onClick={() => onShowRatingModal(item)}
                disabled={item.isReviewed}
              >
                {item.isReviewed ? "Diberi Ulasan" : "Beri Ulasan"}
              </Button>
            )}
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}

export default OrderItemsList;
