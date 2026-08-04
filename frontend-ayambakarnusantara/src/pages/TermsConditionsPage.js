import React from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Breadcrumb,
  ListGroup,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { FileEarmarkText, ShieldLock } from "react-bootstrap-icons";
import "../css/TermsPage.css";

const Section = ({ title, children }) => (
  <div className="mb-4">
    <h2 className="h5 mt-4 fw-bold section-title">{title}</h2>
    <div className="ps-3">{children}</div>
  </div>
);

function TermsConditionsPage() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdatedDate = "16 Juni 2025";

  return (
    <div className="terms-page-container">
      <Container className="my-4 my-md-5">
        <Row className="justify-content-center">
          <Col md={10} lg={9}>
            <Breadcrumb
              listProps={{ className: "bg-transparent p-0 mb-3" }}
              className="breadcrumb-custom-terms"
            >
              <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
                Beranda
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Syarat & Ketentuan</Breadcrumb.Item>
            </Breadcrumb>

            <Card className="shadow-sm border-0 terms-card">
              <Card.Header as="div" className="text-center p-4">
                <FileEarmarkText
                  size={40}
                  className="mb-2"
                  style={{ color: "var(--brand-primary)" }}
                />
                <h1 className="h2 mb-0">Syarat & Ketentuan Penggunaan</h1>
                <p className="text-muted mb-0 small mt-2">
                  Terakhir diperbarui: {lastUpdatedDate}
                </p>
              </Card.Header>
              <Card.Body className="p-4 p-md-5">
                <p className="lead text-center mb-5">
                  Selamat datang di <strong>Ayam Bakar Nusantara</strong>. Harap
                  baca Syarat dan Ketentuan Penggunaan ("Ketentuan") ini dengan
                  saksama sebelum menggunakan platform kami. Dengan menggunakan
                  platform ini, Anda menyetujui ketentuan berikut:
                </p>

                <Section title="1. Definisi">
                  <ListGroup variant="flush" as="ol" numbered>
                    <ListGroup.Item as="li">
                      <strong>"Platform"</strong> merujuk pada situs web,
                      aplikasi, dan layanan yang disediakan oleh Ayam Bakar
                      Nusantara.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      <strong>"Pengguna"</strong>, <strong>"Anda"</strong>{" "}
                      merujuk pada individu atau entitas yang mengakses
                      Platform, baik sebagai Pelanggan maupun Penjual.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      <strong>"Pelanggan"</strong> adalah Pengguna yang
                      melakukan pemesanan produk.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      <strong>"Penjual"</strong> adalah mitra toko pihak ketiga
                      yang terdaftar dan menawarkan produknya melalui Platform.
                    </ListGroup.Item>
                  </ListGroup>
                </Section>

                <Section title="2. Kewajiban Pengguna">
                  <p>Anda setuju untuk:</p>
                  <ul>
                    <li>
                      Memberikan informasi yang akurat, benar, dan terkini saat
                      pendaftaran dan selama penggunaan layanan.
                    </li>
                    <li>
                      Menjaga kerahasiaan kata sandi dan keamanan akun Anda.
                    </li>
                    <li>
                      Tidak menyalahgunakan platform untuk tujuan penipuan,
                      ilegal, atau merugikan pihak lain.
                    </li>
                    <li>
                      Bertanggung jawab penuh atas semua aktivitas yang
                      dilakukan melalui akun Anda.
                    </li>
                  </ul>
                </Section>

                <Section title="3. Ketentuan Khusus Penjual (Mitra Toko)">
                  <p>Sebagai Penjual, Anda setuju untuk:</p>
                  <ul>
                    <li>
                      Menyediakan informasi produk yang akurat, termasuk nama,
                      deskripsi, harga, dan gambar.
                    </li>
                    <li>
                      Menjamin ketersediaan dan kualitas produk yang ditawarkan.
                    </li>
                    <li>
                      Memproses pesanan dari Pelanggan secara profesional, tepat
                      waktu, dan sesuai standar kebersihan makanan.
                    </li>
                    <li>
                      Menangani keluhan Pelanggan terkait produk Anda secara
                      langsung dan bertanggung jawab.
                    </li>
                    <li>
                      Mematuhi semua peraturan perundang-undangan yang berlaku
                      terkait operasional bisnis Anda.
                    </li>
                  </ul>
                </Section>

                <Section title="4. Pemesanan, Pembayaran, dan Pembatalan">
                  <p>
                    <strong>a. Pemesanan:</strong> Semua pesanan yang dilakukan
                    oleh Pelanggan bersifat mengikat. Platform akan meneruskan
                    pesanan Anda ke Penjual terkait untuk diproses. Konfirmasi
                    pesanan tidak menjamin ketersediaan stok mutlak dari
                    Penjual.
                  </p>
                  <p>
                    <strong>b. Pembayaran:</strong> Untuk pembayaran online,
                    kami bekerja sama dengan penyedia gerbang pembayaran yang
                    aman. Kami tidak menyimpan detail kartu kredit Anda. Untuk
                    pembayaran di tempat, kesepakatan terjadi langsung antara
                    Anda dan Penjual.
                  </p>
                  <p>
                    <strong>c. Pembatalan:</strong> Pembatalan pesanan oleh
                    Pelanggan hanya dapat dilakukan sebelum pesanan dikonfirmasi
                    oleh Penjual. Setelah dikonfirmasi, pembatalan tidak
                    dimungkinkan. Penjual berhak membatalkan pesanan jika stok
                    tidak tersedia, dengan kewajiban memberikan notifikasi
                    kepada Pelanggan melalui platform.
                  </p>
                </Section>

                <Section title="5. Hak Kekayaan Intelektual">
                  <p>
                    Seluruh merek dagang, logo, desain, dan konten editorial di
                    Platform adalah milik Ayam Bakar Nusantara. Konten yang
                    diunggah oleh Penjual (seperti foto produk) tetap menjadi
                    milik Penjual, namun Anda memberikan kami lisensi untuk
                    menampilkannya di Platform.
                  </p>
                </Section>

                <Section title="6. Penafian Jaminan (Disclaimer of Warranties)">
                  <p>
                    Layanan ini disediakan "SEBAGAIMANA ADANYA" dan "SEBAGAIMANA
                    TERSEDIA", tanpa jaminan dalam bentuk apa pun. Kami tidak
                    menjamin bahwa platform akan selalu bebas dari kesalahan,
                    bebas virus, atau beroperasi tanpa gangguan. Kami tidak
                    menjamin kualitas, keamanan, atau legalitas produk yang
                    ditawarkan oleh Penjual.
                  </p>
                </Section>

                <Section title="7. Batasan Tanggung Jawab">
                  <p>
                    Ayam Bakar Nusantara tidak akan bertanggung jawab atas
                    kerugian atau kerusakan tidak langsung, insidental, atau
                    konsekuensial, termasuk kehilangan keuntungan, yang timbul
                    dari: (a) penggunaan atau ketidakmampuan Anda untuk
                    menggunakan Layanan; (b) kualitas produk atau layanan dari
                    Penjual; (c) setiap interaksi antara Anda dan Pengguna lain.
                  </p>
                </Section>

                <Section title="8. Ganti Rugi (Indemnification)">
                  <p>
                    Anda setuju untuk membela, mengganti rugi, dan membebaskan
                    Ayam Bakar Nusantara, afiliasinya, serta para direktur dan
                    karyawannya dari segala klaim, kerugian, kewajiban, dan
                    biaya (termasuk biaya hukum) yang timbul dari pelanggaran
                    Anda terhadap Ketentuan ini atau penggunaan Anda atas
                    Platform.
                  </p>
                </Section>

                <Section title="9. Privasi">
                  <p>
                    Penggunaan Anda atas Layanan juga diatur oleh{" "}
                    <Link to="/kebijakan-privasi" className="link-brand">
                      Kebijakan Privasi
                    </Link>{" "}
                    kami, yang menjelaskan bagaimana kami mengumpulkan,
                    menggunakan, dan melindungi data pribadi Anda.
                  </p>
                </Section>
                <Section title="10. Keterpisahan (Severability)">
                  <p>
                    Jika ada bagian dari Ketentuan ini yang dianggap tidak sah
                    atau tidak dapat dilaksanakan, bagian tersebut akan dihapus
                    dan bagian lainnya akan tetap berlaku sepenuhnya.
                  </p>
                </Section>

                <Section title="11. Kontak">
                  <p>
                    Jika Anda memiliki pertanyaan, silakan hubungi tim dukungan
                    kami melalui{" "}
                    <Link to="/#hubungi-kami" className="link-brand">
                      halaman kontak
                    </Link>{" "}
                    atau melalui chatbot kami.
                  </p>
                </Section>
              </Card.Body>
              <Card.Footer className="text-center text-muted small p-3">
                <ShieldLock
                  className="me-2"
                  style={{ color: "var(--brand-primary)" }}
                />{" "}
                Keamanan dan kepatuhan Anda adalah prioritas kami.
              </Card.Footer>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default TermsConditionsPage;
