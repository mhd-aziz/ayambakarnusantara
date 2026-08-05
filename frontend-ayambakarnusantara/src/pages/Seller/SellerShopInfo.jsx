import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Container,
  Alert,
  Card,
  Button,
  Row,
  Col,
  Image,
  ListGroup,
  Form,
  Spinner,
  Modal,
} from "../../components/ui";
import {
  InfoCircleFill,
  PencilSquare,
  Type as ShopNameIcon,
  CardText as DescriptionIcon,
  GeoAltFill as AddressIcon,
  Image as BannerIcon,
  TrashFill,
  CheckCircleFill,
  XCircleFill,
  ExclamationTriangleFill,
  CalendarCheck,
  ClockHistory,
} from "react-bootstrap-icons";
import CreateSellerForm from "../../components/Seller/CreateSellerForm";
import { updateMyShop, deleteMyShop } from "../../services/ShopService";
import { handleShopImageError as handleImageError } from "../../utils/imageFallback";
const ICON_COLOR = "#C07722";

function SellerShopInfo() {
  const outletContext = useOutletContext();
  const {
    currentUserProfile,
    userRole,
    shopData: initialShopData,
    hasShop,
    handleShopCreated,
    loadInitialData,
  } = outletContext || {};

  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  const [editShopName, setEditShopName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editShopAddress, setEditShopAddress] = useState("");
  const [editBannerImageFile, setEditBannerImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editRemoveBannerImage, setEditRemoveBannerImage] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [isDeletingShop, setIsDeletingShop] = useState(false);
  const [deleteShopError, setDeleteShopError] = useState("");

  useEffect(() => {
    if (initialShopData && isEditing) {
      setEditShopName(initialShopData.shopName || "");
      setEditDescription(initialShopData.description || "");
      setEditShopAddress(initialShopData.shopAddress || "");
      setEditImagePreview(initialShopData.bannerImageURL || null);
      setEditBannerImageFile(null);
      setEditRemoveBannerImage(false);
    }
  }, [initialShopData, isEditing]);

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditBannerImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
      setEditRemoveBannerImage(false);
    }
  };

  const handleRemoveBannerChange = (e) => {
    setEditRemoveBannerImage(e.target.checked);
    if (e.target.checked) {
      setEditBannerImageFile(null);
      setEditImagePreview(null);
    } else if (!editBannerImageFile && initialShopData?.bannerImageURL) {
      setEditImagePreview(initialShopData.bannerImageURL);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoadingUpdate(true);
    const dataToUpdate = {};
    if (editShopName !== (initialShopData?.shopName || ""))
      dataToUpdate.shopName = editShopName.trim();
    if (editDescription !== (initialShopData?.description || ""))
      dataToUpdate.description = editDescription.trim();
    if (editShopAddress !== (initialShopData?.shopAddress || ""))
      dataToUpdate.shopAddress = editShopAddress.trim();
    if (editBannerImageFile) dataToUpdate.bannerImage = editBannerImageFile;
    if (editRemoveBannerImage) dataToUpdate.removeBannerImage = true;

    if (Object.keys(dataToUpdate).length === 0) {
      setSuccess("Tidak ada perubahan yang disimpan.");
      setLoadingUpdate(false);
      setIsEditing(false);
      return;
    }
    try {
      const response = await updateMyShop(dataToUpdate);
      if (response && (response.success || response.status === "success")) {
        setSuccess(response.message || "Informasi toko berhasil diperbarui!");
        setIsEditing(false);
        if (loadInitialData) await loadInitialData();
      } else {
        setError(response?.message || "Gagal memperbarui informasi toko.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memperbarui toko.");
    } finally {
      setLoadingUpdate(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmationInput("");
    setDeleteShopError("");
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => setShowDeleteModal(false);

  const handleConfirmDeleteShop = async () => {
    if (deleteConfirmationInput !== initialShopData?.shopName) {
      setDeleteShopError(
        `Nama toko yang Anda masukkan salah. Harap ketik "${initialShopData?.shopName}" dengan benar.`
      );
      return;
    }
    setDeleteShopError("");
    setIsDeletingShop(true);
    try {
      const response = await deleteMyShop();
      alert(response.message || "Toko berhasil dihapus.");
      closeDeleteModal();
      if (loadInitialData) await loadInitialData();
    } catch (err) {
      setDeleteShopError(
        err.message || "Gagal menghapus toko. Silakan coba lagi."
      );
    } finally {
      setIsDeletingShop(false);
    }
  };


  if (!outletContext) {
    return (
      <Container className="flex justify-center items-center h-screen">
        <Spinner animation="border" style={{ color: "var(--brand-primary)" }} />
      </Container>
    );
  }

  if (
    userRole === "customer" ||
    (userRole === "seller" && !hasShop && !isEditing)
  ) {
    return (
      <Container className="seller-page-content">
        <Row className="justify-center">
          <Col md={10} lg={8}>
            {userRole === "customer" && (
              <Alert variant="info" className="mb-4 text-center shadow-sm">
                <InfoCircleFill size={20} className="me-2" />
                Anda perlu mendaftar sebagai penjual dan membuat toko terlebih
                dahulu.
              </Alert>
            )}
            {userRole === "seller" && !hasShop && (
              <Alert variant="warning" className="mb-4 text-center shadow-sm">
                <InfoCircleFill size={20} className="me-2" />
                Data toko tidak ditemukan. Silakan buat toko Anda.
              </Alert>
            )}
            <div className="seller-form">
              <CreateSellerForm onShopCreated={handleShopCreated} />
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

  if (isEditing && userRole === "seller" && hasShop) {
    return (
      <div className="seller-page-content">
        <h2 className="seller-page-title">Edit Informasi Toko</h2>
        {error && (
          <Alert
            variant="danger"
            onClose={() => setError("")}
            dismissible
            className="shadow-sm"
          >
            <XCircleFill className="me-2" /> {error}
          </Alert>
        )}
        {success && (
          <Alert
            variant="success"
            onClose={() => setSuccess("")}
            dismissible
            className="shadow-sm"
          >
            <CheckCircleFill className="me-2" /> {success}
          </Alert>
        )}
        <Form onSubmit={handleUpdateSubmit} className="seller-form">
          <Form.Group
            as={Row}
            className="mb-3 items-center"
            controlId="editShopName"
          >
            <Form.Label column sm={3} className="sm:text-end">
              <ShopNameIcon className="me-2" style={{ color: ICON_COLOR }} />
              Nama Toko
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="text"
                value={editShopName}
                onChange={(e) => setEditShopName(e.target.value)}
                placeholder="Nama Toko Anda"
                disabled={loadingUpdate}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="editShopDescription">
            <Form.Label column sm={3} className="sm:text-end">
              <DescriptionIcon className="me-2" style={{ color: ICON_COLOR }} />
              Deskripsi
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                as="textarea"
                rows={4}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Deskripsi singkat tentang toko Anda"
                disabled={loadingUpdate}
              />
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="editShopAddress">
            <Form.Label column sm={3} className="sm:text-end">
              <AddressIcon className="me-2" style={{ color: ICON_COLOR }} />
              Alamat Toko
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                as="textarea"
                rows={3}
                value={editShopAddress}
                onChange={(e) => setEditShopAddress(e.target.value)}
                placeholder="Alamat lengkap toko"
                disabled={loadingUpdate}
              />
              <Form.Text muted>
                Jika dikosongkan, alamat dari profil Anda mungkin digunakan.
              </Form.Text>
            </Col>
          </Form.Group>
          <Form.Group as={Row} className="mb-3" controlId="editBannerImage">
            <Form.Label column sm={3} className="sm:text-end">
              <BannerIcon className="me-2" style={{ color: ICON_COLOR }} />
              Banner Toko
            </Form.Label>
            <Col sm={9}>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleEditImageChange}
                disabled={loadingUpdate || editRemoveBannerImage}
                className="mb-2"
              />
              {editImagePreview && !editRemoveBannerImage && (
                <Image
                  src={editImagePreview}
                  alt="Preview Banner Baru"
                  className="image-upload-preview mb-2"
                />
              )}
              {initialShopData?.bannerImageURL && (
                <Form.Check
                  type="checkbox"
                  id="removeCurrentBanner"
                  label={
                    <>
                      <TrashFill className="me-1" /> Hapus Banner Saat Ini
                    </>
                  }
                  checked={editRemoveBannerImage}
                  onChange={handleRemoveBannerChange}
                  disabled={loadingUpdate || !!editBannerImageFile}
                />
              )}
            </Col>
          </Form.Group>
          <Row className="mt-4">
            <Col
              sm={{ span: 9, offset: 3 }}
              className="flex justify-start gap-2"
            >
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setError("");
                  setSuccess("");
                }}
                disabled={loadingUpdate}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loadingUpdate}
                className="btn-brand"
              >
                {loadingUpdate ? (
                  <>
                    <Spinner as="span" size="sm" className="me-2" />{" "}
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    );
  }

  if (userRole === "seller" && hasShop && initialShopData) {
    const bannerSrc =
      initialShopData.bannerImageURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        initialShopData.shopName || "Toko"
      )}&size=1200&background=efefef&color=757575&font-size=0.2&bold=true`;
    return (
      <>
        <div className="seller-page-content">
          <div className="seller-page-header">
            <h2 className="seller-page-title">Informasi Toko</h2>
            <div className="seller-header-actions">
              <Button
                variant="primary"
                className="btn-brand"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isDeletingShop}
              >
                <PencilSquare className="me-2" /> Edit Info
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={openDeleteModal}
                disabled={isDeletingShop}
              >
                <TrashFill className="me-2" /> Hapus Toko
              </Button>
            </div>
          </div>
          {error && (
            <Alert
              variant="danger"
              onClose={() => setError("")}
              dismissible
              className="shadow-sm mb-3"
            >
              <XCircleFill className="me-2" /> {error}
            </Alert>
          )}
          {success && (
            <Alert
              variant="success"
              onClose={() => setSuccess("")}
              dismissible
              className="shadow-sm mb-3"
            >
              <CheckCircleFill className="me-2" /> {success}
            </Alert>
          )}

          <Card className="seller-card shadow-sm overflow-hidden">
            <Card.Header className="p-0">
              <Image
                src={bannerSrc}
                alt={`Banner ${initialShopData.shopName}`}
                onError={handleImageError}
                style={{
                  width: "100%",
                  height: "20rem",
                  objectFit: "contain",
                }}
              />
            </Card.Header>
            <Card.Body>
              <Row>
                <Col lg={8}>
                  <Card.Title as="h3" className="mb-2">
                    {initialShopData?.shopName || "Nama Toko Belum Ada"}
                  </Card.Title>
                  <Card.Text className="text-muted mb-4">
                    {initialShopData?.description || "Belum ada deskripsi."}
                  </Card.Text>

                  <ListGroup variant="flush" className="seller-info-list">
                    <ListGroup.Item className="px-0 flex items-start">
                      <AddressIcon
                        size={20}
                        className="me-3 mt-1"
                        style={{ color: ICON_COLOR }}
                      />
                      <div>
                        <strong>Alamat Toko</strong>
                        <p className="mb-0 text-muted">
                          {initialShopData?.shopAddress || "Belum diatur"}
                        </p>
                      </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 flex items-start">
                      <CalendarCheck
                        size={20}
                        className="me-3 mt-1"
                        style={{ color: ICON_COLOR }}
                      />
                      <div>
                        <strong>Bergabung Sejak</strong>
                        <p className="mb-0 text-muted">
                          {initialShopData?.createdAt
                            ? new Date(
                                initialShopData.createdAt
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                            : "-"}
                        </p>
                      </div>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 flex items-start">
                      <ClockHistory
                        size={20}
                        className="me-3 mt-1"
                        style={{ color: ICON_COLOR }}
                      />
                      <div>
                        <strong>Terakhir Diperbarui</strong>
                        <p className="mb-0 text-muted">
                          {initialShopData?.updatedAt
                            ? new Date(
                                initialShopData.updatedAt
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                            : "-"}
                        </p>
                      </div>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>

                <Col lg={4} className="mt-4 lg:mt-0">
                  <Card bg="light" className="h-full">
                    <Card.Body className="text-center">
                      <h6 className="text-muted">PEMILIK TOKO</h6>
                      <Image
                        src={
                          currentUserProfile?.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            currentUserProfile?.displayName || "P"
                          )}&background=C07722&color=fff&size=80`
                        }
                        roundedCircle
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          border: "3px solid white",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                        className="mb-2"
                      />
                      <p className="font-bold mb-0 mt-2">
                        {currentUserProfile?.displayName || "Tidak Diketahui"}
                      </p>
                      <p className="text-muted text-sm">
                        {currentUserProfile?.email}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </div>

        <Modal
          show={showDeleteModal}
          onHide={closeDeleteModal}
          centered
          backdrop="static"
        >
          <Modal.Header
            closeButton={!isDeletingShop}
            className="modal-header-danger"
          >
            <Modal.Title>
              <ExclamationTriangleFill className="me-2" /> Konfirmasi Hapus Toko
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {deleteShopError && (
              <Alert variant="danger">{deleteShopError}</Alert>
            )}
            <p>
              Tindakan ini bersifat permanen dan{" "}
              <strong>tidak dapat diurungkan</strong>. Semua data produk dan
              pesanan terkait toko ini akan dihapus. Status Anda akan diubah
              kembali menjadi customer.
            </p>
            <p>
              Untuk melanjutkan, ketik nama toko Anda:{" "}
              <strong>{initialShopData?.shopName}</strong>
            </p>
            <Form.Group controlId="deleteConfirmationShopName">
              <Form.Control
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="Ketik nama toko di sini"
                isInvalid={
                  !!deleteShopError &&
                  deleteConfirmationInput !== initialShopData?.shopName
                }
                disabled={isDeletingShop}
              />
              <Form.Control.Feedback type="invalid">
                Nama toko tidak sesuai.
              </Form.Control.Feedback>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={closeDeleteModal}
              disabled={isDeletingShop}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmDeleteShop}
              disabled={
                isDeletingShop ||
                deleteConfirmationInput !== initialShopData?.shopName
              }
            >
              {isDeletingShop ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                  />
                  Menghapus...
                </>
              ) : (
                "Ya, Hapus Toko Saya"
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  return (
    <Container className="text-center mt-4 seller-page-content">
      <Alert variant="light" className="shadow-sm">
        Memuat informasi toko atau tidak ada data untuk ditampilkan.
      </Alert>
    </Container>
  );
}

export default SellerShopInfo;