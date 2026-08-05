import React from "react";
import { Card, Button } from "react-bootstrap";
import { InfoCircleFill } from "react-bootstrap-icons";

const ICON_COLOR = "#C07722";

function SupportCard({ onOpenChatbot }) {
  return (
    <Card className="shadow-sm">
      <Card.Header as="h5">
        <InfoCircleFill color={ICON_COLOR} className="me-2" />
        Bantuan
      </Card.Header>
      <Card.Body>
        <p className="small">
          Jika ada masalah dengan pesanan Anda, silakan hubungi layanan
          pelanggan kami.
        </p>
        <Button
          variant="outline-secondary"
          size="sm"
          className="w-100"
          onClick={onOpenChatbot}
        >
          Hubungi Dukungan
        </Button>
      </Card.Body>
    </Card>
  );
}

export default SupportCard;
