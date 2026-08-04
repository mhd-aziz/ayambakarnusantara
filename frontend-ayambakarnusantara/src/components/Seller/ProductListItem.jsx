import React from "react";
import { Card, Button, Col, Badge, Image, Row } from "../ui";
import { PencilSquare, TrashFill, Eye } from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { handleProductSmallImageError as handleImageError } from "../../utils/imageFallback";

function ProductListItem({ product, onEdit, onDelete }) {

  return (
    <Col md={6} lg={4} className="mb-4 d-flex align-items-stretch">
      <Card className="w-100 shadow-sm product-management-card">
        <Row className="g-0 h-100">
          <Col
            xs={4}
            className="d-flex align-items-center justify-content-center p-2"
          >
            <Image
              src={
                product.productImageURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  product.name || "Produk"
                )}&background=EFEFEF&color=AAAAAA&size=100`
              }
              alt={product.name || "Gambar Produk"}
              className="product-list-image"
              onError={handleImageError}
            />
          </Col>
          <Col xs={8}>
            <Card.Body className="d-flex flex-column h-100 p-2 p-md-3">
              <Card.Title className="h6 mb-1 text-truncate-2">
                {product.name}
              </Card.Title>
              <Badge
                pill
                bg="light"
                text="dark"
                className="mb-2 align-self-start"
                style={{ fontSize: "0.7rem" }}
              >
                {product.category}
              </Badge>
              <Card.Text className="small text-muted mb-1">
                Harga: Rp {product.price.toLocaleString("id-ID")}
              </Card.Text>
              <Card.Text className="small text-muted mb-2">
                Stok: {product.stock}
              </Card.Text>
              <div className="mt-auto d-flex justify-content-end gap-2 pt-2 border-top">
                <Button
                  as={Link}
                  to={`/menu/${product._id || product.productId}`}
                  variant="outline-info"
                  size="sm"
                  title="Lihat Produk"
                  className="p-1"
                >
                  <Eye size={16} />
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => onEdit(product)}
                  title="Edit Produk"
                  className="p-1"
                >
                  <PencilSquare size={16} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onDelete(product._id || product.productId)}
                  title="Hapus Produk"
                  className="p-1"
                >
                  <TrashFill size={16} />
                </Button>
              </div>
            </Card.Body>
          </Col>
        </Row>
      </Card>
    </Col>
  );
}

export default ProductListItem;
