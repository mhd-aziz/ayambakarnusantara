import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Button,
  Form,
} from "react-bootstrap";
import {
  InfoCircleFill,
  BoxSeam,
  ClipboardCheck,
  CashCoin,
  ClipboardData,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import CreateSellerForm from "../../components/Seller/CreateSellerForm";
import { getMyShopStatistics } from "../../services/ShopService";

const StatCard = ({ title, value, description, icon, isLoading }) => (
  <Col md={6} lg={3} className="mb-4">
    <Card
      className="h-100 shadow-sm text-center"
      style={{
        borderTop: "4px solid var(--brand-primary, #C07722)",
      }}
    >
      <Card.Body>
        <div
          className="mb-2"
          style={{
            fontSize: "2rem",
            color: "var(--brand-primary, #C07722)",
          }}
        >
          {icon}
        </div>
        <Card.Title as="h6" className="text-muted text-uppercase">
          {title}
        </Card.Title>
        {isLoading ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <Card.Text className="fs-4 fw-bold">{value}</Card.Text>
        )}
        <Card.Text className="small text-muted">{description}</Card.Text>
      </Card.Body>
    </Card>
  </Col>
);

function SellerDashboardOverview() {
  const outletContext = useOutletContext();
  const { currentUserProfile, userRole, shopData, hasShop, handleShopCreated } =
    outletContext || {};

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [period, setPeriod] = useState("all_time");

  const fetchStatistics = useCallback(async () => {
    if (!hasShop) return;

    setStatsLoading(true);
    setStatsError("");
    try {
      const response = await getMyShopStatistics({ period });
      if (response && response.success) {
        setStats(response.data);
      } else {
        setStatsError(response?.message || "Gagal memuat statistik.");
      }
    } catch (err) {
      setStatsError(
        err.message || "Terjadi kesalahan pada server saat memuat statistik."
      );
    } finally {
      setStatsLoading(false);
    }
  }, [hasShop, period]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  if (userRole === "customer" || (userRole === "seller" && !hasShop)) {
    return (
      <Container>
        <Row className="justify-content-center">
          <Col md={10} lg={8}>
            {userRole === "customer" && (
              <Alert variant="info" className="mb-4 text-center">
                <InfoCircleFill size={20} className="me-2" />
                Anda saat ini terdaftar sebagai pelanggan. <br />
                Lengkapi form di bawah ini untuk membuka toko Anda!
              </Alert>
            )}
            {userRole === "seller" && !hasShop && (
              <Alert variant="warning" className="mb-4 text-center">
                <InfoCircleFill size={20} className="me-2" />
                Anda terdaftar sebagai penjual, namun data toko tidak ditemukan.{" "}
                <br />
                Silakan buat toko Anda sekarang.
              </Alert>
            )}
            <CreateSellerForm onShopCreated={handleShopCreated} />
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
        <h3 className="mb-0">Dashboard Toko</h3>
        <Form.Group as={Row} className="align-items-center gx-2 gy-2">
          <Form.Label column xs="auto">
            Periode:
          </Form.Label>
          <Col xs="auto">
            <Form.Select
              size="sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={statsLoading}
            >
              <option value="daily">Hari Ini</option>
              <option value="weekly">7 Hari Terakhir</option>
              <option value="monthly">30 Hari Terakhir</option>
              <option value="all_time">Semua Waktu</option>
            </Form.Select>
          </Col>
        </Form.Group>
      </div>

      {statsError && (
        <Alert
          variant="danger"
          onClose={() => setStatsError("")}
          dismissible
          className="d-flex align-items-center"
        >
          <ExclamationTriangleFill className="me-2" /> {statsError}
          <Button
            variant="link"
            className="p-0 ms-2 text-danger"
            onClick={fetchStatistics}
          >
            Coba lagi
          </Button>
        </Alert>
      )}

      <Row>
        <StatCard
          title="Total Produk"
          value={stats?.totalProducts ?? "-"}
          description="Jumlah semua produk aktif di toko Anda."
          icon={<BoxSeam />}
          isLoading={statsLoading}
        />
        <StatCard
          title="Pesanan Baru"
          value={stats?.newOrders?.count ?? "-"}
          description={
            stats?.newOrders?.description || "Pesanan masuk dalam periode ini."
          }
          icon={<ClipboardData />}
          isLoading={statsLoading}
        />
        <StatCard
          title="Pesanan Selesai"
          value={stats?.completedOrders?.count ?? "-"}
          description={
            stats?.completedOrders?.description ||
            "Pesanan selesai dalam periode ini."
          }
          icon={<ClipboardCheck />}
          isLoading={statsLoading}
        />
        <StatCard
          title="Pendapatan"
          value={stats?.revenue?.formatted ?? "-"}
          description={
            stats?.revenue?.description ||
            "Pendapatan dari pesanan yang selesai."
          }
          icon={<CashCoin />}
          isLoading={statsLoading}
        />
      </Row>

      <Card className="shadow-sm mt-4">
        <Card.Body>
          <Card.Title>
            Selamat Datang, {currentUserProfile?.displayName || "Penjual"}!
          </Card.Title>
          <Card.Text>
            Ini adalah halaman dashboard toko Anda,{" "}
            <strong>{shopData?.shopName}</strong>. Gunakan sidebar untuk
            mengelola toko dan produk Anda.
          </Card.Text>
        </Card.Body>
      </Card>
    </div>
  );
}

export default SellerDashboardOverview;
