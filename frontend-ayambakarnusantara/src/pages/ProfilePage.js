import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Button,
  Card,
  Spinner,
  Alert,
  Row,
  Col,
  Image,
  ListGroup,
  Modal,
  Form,
} from "react-bootstrap";
import {
  EnvelopeFill,
  TelephoneFill,
  GeoAltFill,
  CalendarDateFill,
  ClockHistory,
  PencilSquare,
  ExclamationCircleFill,
  InfoCircleFill,
  TrashFill,
} from "react-bootstrap-icons";
import { useAuth } from "../context/AuthContext";
import { getProfile, deleteAccount } from "../services/ProfileService";
import EditProfileForm from "../components/Profile/EditProfileForm";
import { Navigate } from "react-router-dom";

const ICON_COLOR = "#C07722";
const DELETE_CONFIRMATION_TEXT = "hapus akun";

function ProfilePage() {
  const {
    isLoggedIn,
    user: authUser,
    login: updateUserInContext,
    logout: contextLogout,
  } = useAuth();

  const [profileData, setProfileData] = useState(authUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");

  const fetchProfileData = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const apiResponse = await getProfile();

      if (
        apiResponse &&
        (apiResponse.status === "success" || apiResponse.success === true) &&
        apiResponse.data
      ) {
        setProfileData(apiResponse.data);
        if (typeof apiResponse.data === "object" && apiResponse.data !== null) {
          updateUserInContext(apiResponse.data, { navigateAfterLogin: false });
        }
      } else {
        if (
          !(apiResponse?.statusCode === 401 || apiResponse?.statusCode === 403)
        ) {
          setError(
            apiResponse?.message ||
              "Gagal mengambil data profil (format respons tidak sesuai)."
          );
        }
      }
    } catch (err) {
      if (
        !(
          err.response &&
          (err.response.status === 401 || err.response.status === 403)
        )
      ) {
        setError(err.message || "Terjadi kesalahan saat mengambil profil.");
      }
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn, updateUserInContext]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleProfileUpdated = (updatedProfileDataFromForm) => {
    if (
      updatedProfileDataFromForm &&
      (updatedProfileDataFromForm.status === "success" ||
        updatedProfileDataFromForm.success === true) &&
      updatedProfileDataFromForm.data
    ) {
      setProfileData(updatedProfileDataFromForm.data);
      if (
        typeof updatedProfileDataFromForm.data === "object" &&
        updatedProfileDataFromForm.data !== null
      ) {
        updateUserInContext(updatedProfileDataFromForm.data, {
          navigateAfterLogin: false,
        });
      }
    } else {
      setError(
        updatedProfileDataFromForm?.message ||
          "Update berhasil, namun gagal memperbarui tampilan data secara langsung."
      );
    }
    setIsEditing(false);
  };

  const handleShowDeleteModal = () => {
    setDeleteError("");
    setDeleteConfirmationInput("");
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => setShowDeleteModal(false);

  const handleConfirmDelete = async () => {
    if (deleteConfirmationInput !== DELETE_CONFIRMATION_TEXT) {
      setDeleteError(
        `Ketik "${DELETE_CONFIRMATION_TEXT}" untuk mengonfirmasi.`
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await deleteAccount();
      if (response.success) {
        alert("Akun Anda telah berhasil dihapus secara permanen.");
        contextLogout();
      } else {
        setDeleteError(response.message || "Gagal menghapus akun.");
      }
    } catch (err) {
      setDeleteError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isLoggedIn && !loading) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <Container
        fluid
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ minHeight: "calc(100vh - 120px)" }}
      >
        {authUser && (
          <p className="mb-3 fs-5" style={{ color: ICON_COLOR }}>
            Memuat profil untuk {authUser.displayName || authUser.email}...
          </p>
        )}
        <Spinner
          animation="border"
          role="status"
          style={{ width: "3rem", height: "3rem", color: ICON_COLOR }}
        >
          <span className="visually-hidden">Memuat data profil...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5 text-center">
        <Alert variant="danger" className="py-4 shadow-sm">
          <Alert.Heading className="d-flex align-items-center justify-content-center">
            <ExclamationCircleFill size={24} className="me-2" /> Oops! Terjadi
            Kesalahan
          </Alert.Heading>
          <p className="mb-3">{error}</p>
          <Button onClick={fetchProfileData} variant="danger">
            Coba Lagi
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!profileData && isLoggedIn) {
    return (
      <Container className="mt-5 text-center">
        <Alert variant="warning" className="py-4 shadow-sm">
          <Alert.Heading className="d-flex align-items-center justify-content-center">
            <InfoCircleFill size={24} className="me-2" /> Data Profil Tidak
            Tersedia
          </Alert.Heading>
          <p className="mb-3">
            Tidak dapat memuat data profil Anda saat ini. Sesi Anda mungkin
            telah berakhir atau terjadi masalah lain. Silakan coba login
            kembali.
          </p>
          <Button
            onClick={() => contextLogout()}
            variant="outline-warning"
            className="mt-2 me-2"
          >
            Kembali ke Login
          </Button>
          <Button onClick={fetchProfileData} variant="warning" className="mt-2">
            Coba Muat Ulang
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!profileData) {
    return (
      <Container className="mt-5 text-center">
        <Alert variant="light" className="py-4 shadow-sm border">
          <InfoCircleFill size={24} className="me-2 text-muted" />
          Tidak ada data profil untuk ditampilkan saat ini.
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Container className="mt-4 mb-5">
        <Card className="shadow-lg border-0">
          <Card.Header
            as="h2"
            className="d-flex justify-content-between align-items-center text-white p-4"
            style={{ background: ICON_COLOR }}
          >
            <span style={{ fontWeight: 500 }}>Profil Saya</span>
            {!isEditing && (
              <div className="d-flex gap-2">
                <Button
                  variant="light"
                  onClick={() => setIsEditing(true)}
                  className="d-flex align-items-center"
                  size="sm"
                >
                  <PencilSquare className="me-2" /> Edit Profil
                </Button>
                <Button
                  variant="outline-light"
                  size="sm"
                  onClick={handleShowDeleteModal}
                  className="d-flex align-items-center"
                >
                  <TrashFill className="me-2" /> Hapus Akun
                </Button>
              </div>
            )}
          </Card.Header>
          <Card.Body className="p-4 p-md-5">
            {isEditing ? (
              <EditProfileForm
                currentProfile={profileData}
                onProfileUpdated={handleProfileUpdated}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <Row className="align-items-center">
                <Col md={4} lg={3} className="text-center mb-4 mb-md-0">
                  <Image
                    src={
                      profileData.photoURL ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        profileData.displayName || profileData.email || "U"
                      )}&background=C07722&color=fff&size=200&font-size=0.45&bold=true`
                    }
                    roundedCircle
                    alt="Foto Profil"
                    style={{
                      width: "180px",
                      height: "180px",
                      objectFit: "cover",
                      border: "5px solid #E9ECEF",
                      boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                    }}
                    className="mb-3"
                  />
                  <h3 className="mb-1" style={{ color: "#343a40" }}>
                    {profileData.displayName || "Nama Belum Diatur"}
                  </h3>
                  <p className="text-muted mb-0">
                    <EnvelopeFill
                      className="me-2"
                      style={{ color: "#6c757d" }}
                    />
                    {profileData.email}
                  </p>
                </Col>
                <Col md={8} lg={9}>
                  <h4 className="mb-4 text-secondary border-bottom pb-2">
                    Informasi Akun
                  </h4>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="px-0 py-3 d-flex justify-content-between align-items-start">
                      <div>
                        <GeoAltFill
                          className="me-2"
                          size={20}
                          style={{ color: ICON_COLOR }}
                        />
                        <strong className="text-dark">Alamat</strong>
                      </div>
                      <span className="text-muted text-sm-end">
                        {profileData.address || "-"}
                      </span>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 py-3 d-flex justify-content-between align-items-start">
                      <div>
                        <TelephoneFill
                          className="me-2"
                          size={20}
                          style={{ color: ICON_COLOR }}
                        />
                        <strong className="text-dark">Nomor Telepon</strong>
                      </div>
                      <span className="text-muted text-sm-end">
                        {profileData.phoneNumber || "-"}
                      </span>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 py-3 d-flex justify-content-between align-items-start">
                      <div>
                        <CalendarDateFill
                          className="me-2"
                          size={20}
                          style={{ color: ICON_COLOR }}
                        />
                        <strong className="text-dark">Bergabung Sejak</strong>
                      </div>
                      <span className="text-muted text-sm-end">
                        {profileData.createdAt
                          ? new Date(profileData.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "-"}
                      </span>
                    </ListGroup.Item>
                    <ListGroup.Item className="px-0 py-3 d-flex justify-content-between align-items-start">
                      <div>
                        <ClockHistory
                          className="me-2"
                          size={20}
                          style={{ color: ICON_COLOR }}
                        />
                        <strong className="text-dark">
                          Terakhir Diperbarui
                        </strong>
                      </div>
                      <span className="text-muted text-sm-end">
                        {profileData.updatedAt
                          ? new Date(profileData.updatedAt).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              }
                            )
                          : "-"}
                      </span>
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      </Container>
      <Modal
        show={showDeleteModal}
        onHide={handleCloseDeleteModal}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <ExclamationCircleFill className="me-2 text-danger" />
            Konfirmasi Hapus Akun
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <p>
            Tindakan ini <strong>tidak dapat diurungkan</strong>. Semua data
            Anda akan dihapus secara permanen.
          </p>
          <Form.Group controlId="deleteConfirmationInput">
            <Form.Label>
              Untuk melanjutkan, ketik `
              <strong>{DELETE_CONFIRMATION_TEXT}</strong>` di bawah ini.
            </Form.Label>
            <Form.Control
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              disabled={isDeleting}
              autoComplete="off"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleCloseDeleteModal}
            disabled={isDeleting}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmDelete}
            disabled={
              isDeleting || deleteConfirmationInput !== DELETE_CONFIRMATION_TEXT
            }
          >
            {isDeleting ? (
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
              "Ya, Hapus Akun Saya"
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ProfilePage;
