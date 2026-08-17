import React from "react";
import { Link } from "react-router-dom";
import { Card, Image, Button } from "react-bootstrap";
import { Shop, GeoAltFill } from "react-bootstrap-icons";

const ICON_COLOR = "#C07722";

function ShopDetailsCard({ shopDetails, orderItems, handleImageError }) {
  const shopId = orderItems?.[0]?.shopId;

  if (!shopDetails || !shopDetails.shopName) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Header as="h5">
          <Shop color={ICON_COLOR} className="me-2" />
          Detail Toko
        </Card.Header>
        <Card.Body>
          <p className="text-muted small">Detail toko tidak tersedia.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header as="h5">
        <Shop color={ICON_COLOR} className="me-2" />
        Detail Toko
      </Card.Header>
      <Card.Body>
        <Image
          src={
            shopDetails.bannerImageURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              shopDetails.shopName || "Toko"
            )}&size=400&background=efefef&color=757575&font-size=0.33&length=2`
          }
          alt={`Banner ${shopDetails.shopName}`}
          fluid
          rounded
          className="mb-3"
          style={{
            maxHeight: "150px",
            width: "100%",
            objectFit: "contain",
            backgroundColor: "#f8f9fa",
          }}
          onError={(e) => handleImageError(e, shopDetails.shopName)}
        />
        <h5>{shopDetails.shopName}</h5>
        {shopDetails.shopAddress && (
          <p className="mb-1 small">
            <GeoAltFill className="me-1" /> {shopDetails.shopAddress}
          </p>
        )}
        {shopDetails.description && (
          <p className="text-muted small mb-2">{shopDetails.description}</p>
        )}
        {shopId && (
          <Button
            as={Link}
            to={`/toko/${shopId}`}
            size="sm"
            className="w-100 btn-brand"
          >
            Kunjungi Toko
          </Button>
        )}
      </Card.Body>
    </Card>
  );
}

export default ShopDetailsCard;
