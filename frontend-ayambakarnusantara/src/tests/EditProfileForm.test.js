import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import EditProfileForm from "../components/Profile/EditProfileForm";
import { updateProfile } from "../services/ProfileService";

jest.mock("../services/ProfileService", () => ({
  updateProfile: jest.fn(),
}));

const mockCurrentProfile = {
  displayName: "John Doe",
  phoneNumber: "08123456789",
  address: "123 Main St",
  photoURL: "https://example.com/profile.jpg",
  email: "john.doe@example.com",
};

const mockOnProfileUpdated = jest.fn();
const mockOnCancel = jest.fn();

describe("Komponen EditProfileForm", () => {
  beforeEach(() => {
    updateProfile.mockClear();
    mockOnProfileUpdated.mockClear();
    mockOnCancel.mockClear();
  });

  test("harus merender data profil awal dengan benar", () => {
    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Nama Tampilan/i)).toHaveValue(
      mockCurrentProfile.displayName
    );
    expect(screen.getByLabelText(/Nomor Telepon/i)).toHaveValue(
      mockCurrentProfile.phoneNumber
    );
    expect(screen.getByLabelText(/Alamat/i)).toHaveValue(
      mockCurrentProfile.address
    );
    expect(screen.getByAltText("Preview Foto Profil")).toHaveAttribute(
      "src",
      mockCurrentProfile.photoURL
    );
  });

  test("harus memperbarui kolom nama tampilan saat ada perubahan", async () => {
    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );
    const displayNameInput = screen.getByLabelText(/Nama Tampilan/i);
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, "Jane Doe");
    expect(displayNameInput).toHaveValue("Jane Doe");
  });

  test("harus memanggil onCancel saat tombol batal diklik", async () => {
    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );
    const cancelButton = screen.getByRole("button", { name: /Batal/i });
    await userEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test("harus menangani pembaruan profil yang sukses", async () => {
    updateProfile.mockResolvedValueOnce({
      success: true,
      message: "Profil berhasil diperbarui!",
      data: { ...mockCurrentProfile, displayName: "John Doe Updated" },
    });

    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );

    const displayNameInput = screen.getByLabelText(/Nama Tampilan/i);
    await userEvent.clear(displayNameInput);
    await userEvent.type(displayNameInput, "John Doe Updated");

    const saveButton = screen.getByRole("button", {
      name: /Simpan Perubahan/i,
    });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });

    const formData = updateProfile.mock.calls[0][0];
    expect(formData.get("displayName")).toBe("John Doe Updated");

    await waitFor(() => {
      expect(
        screen.getByText(/Profil berhasil diperbarui!/i)
      ).toBeInTheDocument();
    });
    expect(mockOnProfileUpdated).toHaveBeenCalledWith({
      success: true,
      message: "Profil berhasil diperbarui!",
      data: { ...mockCurrentProfile, displayName: "John Doe Updated" },
    });
  });

  test("harus menangani pembaruan profil yang gagal", async () => {
    updateProfile.mockResolvedValueOnce({
      success: false,
      message: "Gagal memperbarui profil.",
    });

    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );

    const saveButton = screen.getByRole("button", {
      name: /Simpan Perubahan/i,
    });
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(
        screen.getByText(/Gagal memperbarui profil./i)
      ).toBeInTheDocument();
    });
    expect(mockOnProfileUpdated).not.toHaveBeenCalled();
  });

  test("harus menangani pemilihan gambar dan menampilkan pratinjau", async () => {
    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const gantiFotoButton = screen.getByRole("button", { name: /Ganti Foto/i });
    const imageInput = gantiFotoButton.previousElementSibling;

    global.URL.createObjectURL = jest.fn(
      () => "blob:http://localhost/mock-image-url"
    );

    await userEvent.upload(imageInput, file);

    expect(imageInput.files[0]).toBe(file);
    expect(imageInput.files.length).toBe(1);
    expect(screen.getByAltText("Preview Foto Profil")).toHaveAttribute(
      "src",
      "blob:http://localhost/mock-image-url"
    );

    global.URL.createObjectURL.mockRestore();
  });

  test("harus menangani checkbox untuk hapus foto profil", async () => {
    render(
      <EditProfileForm
        currentProfile={mockCurrentProfile}
        onProfileUpdated={mockOnProfileUpdated}
        onCancel={mockOnCancel}
      />
    );

    const removeCheckbox = screen.getByLabelText(/Hapus Foto/i);
    expect(screen.getByAltText("Preview Foto Profil")).toHaveAttribute(
      "src",
      mockCurrentProfile.photoURL
    );

    await userEvent.click(removeCheckbox);
    expect(removeCheckbox).toBeChecked();
    expect(screen.getByAltText("Preview Foto Profil").src).toContain(
      "ui-avatars.com"
    );

    await userEvent.click(removeCheckbox);
    expect(removeCheckbox).not.toBeChecked();
    expect(screen.getByAltText("Preview Foto Profil")).toHaveAttribute(
      "src",
      mockCurrentProfile.photoURL
    );
  });
});
