// src/components/Profile/EditProfileForm.js
import React, { useState, useEffect } from "react";
import {
  Form,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
  Image as BootstrapImage,
} from "react-bootstrap";
import {
  PersonFill,
  TelephoneFill,
  GeoAltFill,
  ImageFill,
  TrashFill,
  CheckCircleFill,
  XCircleFill,
} from "react-bootstrap-icons";
import { updateProfile } from "../../services/ProfileService";

const ICON_COLOR = "#C07722";

function EditProfileForm({ currentProfile, onProfileUpdated, onCancel }) {

  const [displayName, setDisplayName] = useState(
    currentProfile.displayName || ""
  );
  const [phoneNumber, setPhoneNumber] = useState(
    currentProfile.phoneNumber || ""
  );
  const [address, setAddress] = useState(currentProfile.address || "");
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    currentProfile.photoURL || null
  );
  const [removeProfilePhoto, setRemoveProfilePhoto] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setDisplayName(currentProfile.displayName || "");
    setPhoneNumber(currentProfile.phoneNumber || "");
    setAddress(currentProfile.address || "");
    setImagePreview(currentProfile.photoURL || null);
    setProfileImageFile(null);
    setRemoveProfilePhoto(false);
    setError("");
    setSuccess("");
  }, [currentProfile]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setRemoveProfilePhoto(false);
    }
  };

  const handleRemoveProfilePhotoChange = (e) => {
    setRemoveProfilePhoto(e.target.checked);
    if (e.target.checked) {
      setProfileImageFile(null);
      setImagePreview(null);
    } else if (!profileImageFile && currentProfile.photoURL) {
      setImagePreview(currentProfile.photoURL);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const formDataInstance = new FormData();
    formDataInstance.append("displayName", displayName.trim());
    if (phoneNumber || phoneNumber === "")
      formDataInstance.append("phoneNumber", phoneNumber.trim());
    if (address || address === "")
      formDataInstance.append("address", address.trim());

    if (profileImageFile) {
      formDataInstance.append("profileImage", profileImageFile);
    }
    if (removeProfilePhoto) {
      formDataInstance.append("removeProfilePhoto", "true");
    }

    try {
      const response = await updateProfile(formDataInstance);

      if (
        response &&
        (response.status === "success" || response.success === true)
      ) {
        setSuccess(response.message || "Profil berhasil diperbarui!");
        if (onProfileUpdated) {
          onProfileUpdated(response);
        }
        setProfileImageFile(null);
      } else {
        setError(response?.message || "Gagal memperbarui profil.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memperbarui profil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {error && (
        <Alert
          variant="danger"
          onClose={() => setError("")}
          dismissible
          className="d-flex align-items-center"
        >
          <XCircleFill className="me-2" /> {error}
        </Alert>
      )}
      {success && (
        <Alert
          variant="success"
          onClose={() => setSuccess("")}
          dismissible
          className="d-flex align-items-center"
        >
          <CheckCircleFill className="me-2" /> {success}
        </Alert>
      )}

      <Row>
        <Col md={12} className="text-center mb-4">
          <BootstrapImage
            src={
              imagePreview ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                displayName || currentProfile.email || "A"
              )}&background=E9ECEF&color=7F8C9B&size=150`
            }
            roundedCircle
            alt="Preview Foto Profil"
            style={{
              width: "150px",
              height: "150px",
              objectFit: "cover",
              border: `3px solid ${imagePreview ? ICON_COLOR : "#dee2e6"}`,
              cursor: "pointer",
            }}
            className="mb-2"
            onClick={() =>
              document.getElementById("profileImageInput")?.click()
            }
          />
          <Form.Control
            type="file"
            id="profileImageInput"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
            style={{ display: "none" }}
          />
          <Button
            variant="link"
            size="sm"
            onClick={() =>
              document.getElementById("profileImageInput")?.click()
            }
            disabled={loading}
          >
            <ImageFill className="me-1" /> Ganti Foto
          </Button>
          {currentProfile.photoURL || imagePreview ? (
            <Form.Group
              controlId="formRemoveProfilePhoto"
              className="mt-2 text-center d-inline-block ms-2"
            >
              <Form.Check
                type="checkbox"
                label={
                  <>
                    <TrashFill className="me-1" /> Hapus Foto
                  </>
                }
                checked={removeProfilePhoto}
                onChange={handleRemoveProfilePhotoChange}
                disabled={loading || !!profileImageFile}
              />
            </Form.Group>
          ) : null}
        </Col>
      </Row>

      <Form.Group as={Row} className="mb-3" controlId="formDisplayName">
        <Form.Label column sm={3} className="text-sm-end">
          <PersonFill className="me-2" style={{ color: ICON_COLOR }} /> Nama
          Tampilan
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            required
            placeholder="Masukkan nama tampilan Anda"
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="formPhoneNumber">
        <Form.Label column sm={3} className="text-sm-end">
          <TelephoneFill className="me-2" style={{ color: ICON_COLOR }} /> Nomor
          Telepon
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+6281234567890 (opsional)"
            disabled={loading}
          />
        </Col>
      </Form.Group>

      <Form.Group as={Row} className="mb-3" controlId="formAddress">
        <Form.Label column sm={3} className="text-sm-end">
          <GeoAltFill className="me-2" style={{ color: ICON_COLOR }} /> Alamat
        </Form.Label>
        <Col sm={9}>
          <Form.Control
            as="textarea"
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Masukkan alamat Anda (opsional)"
            disabled={loading}
          />
        </Col>
      </Form.Group>

      <Row className="mt-4">
        <Col
          sm={{ span: 9, offset: 3 }}
          className="d-flex justify-content-start gap-2"
        >
          {" "}
          {onCancel && (
            <Button
              variant="outline-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Batal
            </Button>
          )}
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="btn-brand"
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Menyimpan...
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

export default EditProfileForm;
