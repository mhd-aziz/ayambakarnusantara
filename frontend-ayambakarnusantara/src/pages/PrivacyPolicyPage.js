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
import { ShieldShaded } from "react-bootstrap-icons";
import "../css/PrivacyPolicyPage.css";
const Section = ({ title, children }) => (
  <div className="mb-4">
    <h2 className="h5 mt-4 fw-bold section-title">{title}</h2>
    <div className="ps-3">{children}</div>
  </div>
);

function PrivacyPolicyPage() {
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const lastUpdatedDate = "16 Juni 2025";

  return (
    <div className="privacy-page-container">
      <Container className="my-4 my-md-5">
        <Row className="justify-content-center">
          <Col md={10} lg={9}>
            <Breadcrumb
              listProps={{ className: "bg-transparent p-0 mb-3" }}
              className="breadcrumb-custom-privacy"
            >
              <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
                Beranda
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Kebijakan Privasi</Breadcrumb.Item>
            </Breadcrumb>

            <Card className="shadow-sm border-0 privacy-card">
              <Card.Header as="div" className="text-center p-4">
                <ShieldShaded
                  size={40}
                  className="mb-2"
                  style={{ color: "var(--brand-primary)" }}
                />
                <h1 className="h2 mb-0">Kebijakan Privasi</h1>
                <p className="text-muted mb-0 small mt-2">
                  Terakhir diperbarui: {lastUpdatedDate}
                </p>
              </Card.Header>
              <Card.Body className="p-4 p-md-5">
                <p className="lead">
                  Di Ayam Bakar Nusantara, kami menghargai privasi Anda dan
                  berkomitmen untuk melindungi data pribadi Anda. Kebijakan
                  Privasi ini menjelaskan bagaimana kami mengumpulkan,
                  menggunakan, mengungkapkan, dan menjaga informasi Anda saat
                  Anda menggunakan platform kami.
                </p>

                <Section title="1. Informasi yang Kami Kumpulkan">
                  <p>
                    Kami dapat mengumpulkan informasi tentang Anda dalam
                    berbagai cara, termasuk:
                  </p>
                  <ul>
                    <li>
                      <strong>Data Pribadi yang Dapat Diidentifikasi:</strong>{" "}
                      Informasi yang Anda berikan secara sukarela saat
                      mendaftar, seperti nama, alamat email, nomor telepon, dan
                      alamat.
                    </li>
                    <li>
                      <strong>Data Derivatif:</strong> Informasi yang
                      dikumpulkan server kami secara otomatis saat Anda
                      mengakses Platform, seperti alamat IP Anda, jenis browser,
                      sistem operasi, dan halaman yang Anda kunjungi.
                    </li>
                    <li>
                      <strong>Data Pesanan:</strong> Informasi terkait pesanan
                      yang Anda buat, termasuk produk yang dibeli, toko penjual,
                      dan riwayat transaksi.
                    </li>
                    <li>
                      <strong>Data dari Layanan Pihak Ketiga:</strong> Jika Anda
                      mendaftar menggunakan akun pihak ketiga (misalnya,
                      Google), kami dapat mengakses informasi dasar dari akun
                      tersebut sesuai dengan izin yang Anda berikan.
                    </li>
                  </ul>
                </Section>

                <Section title="2. Penggunaan Informasi Anda">
                  <p>
                    Informasi yang kami kumpulkan digunakan untuk tujuan
                    berikut:
                  </p>
                  <ListGroup variant="flush" as="ol" numbered>
                    <ListGroup.Item as="li">
                      Membuat dan mengelola akun Anda.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      Memfasilitasi dan memproses pesanan dan pembayaran Anda.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      Mengirimkan notifikasi terkait akun dan pesanan Anda.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      Memungkinkan komunikasi antara Anda dan Penjual melalui
                      fitur chat kami.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      Menganalisis penggunaan platform untuk meningkatkan
                      pengalaman pengguna dan layanan kami.
                    </ListGroup.Item>
                    <ListGroup.Item as="li">
                      Mencegah aktivitas penipuan dan menjaga keamanan Platform.
                    </ListGroup.Item>
                  </ListGroup>
                </Section>

                <Section title="3. Pengungkapan Informasi Anda">
                  <p>
                    Kami dapat membagikan informasi yang kami kumpulkan tentang
                    Anda dalam situasi tertentu:
                  </p>
                  <ul>
                    <li>
                      <strong>Kepada Penjual (Mitra Toko):</strong> Kami
                      membagikan informasi yang diperlukan (seperti detail
                      pesanan dan nama Anda) kepada Penjual untuk memungkinkan
                      mereka memenuhi pesanan Anda.
                    </li>
                    <li>
                      <strong>
                        Berdasarkan Hukum atau untuk Melindungi Hak:
                      </strong>{" "}
                      Jika kami yakin pengungkapan diperlukan untuk menanggapi
                      proses hukum, untuk menyelidiki atau memperbaiki potensi
                      pelanggaran kebijakan kami, atau untuk melindungi hak,
                      properti, dan keselamatan orang lain.
                    </li>
                    <li>
                      <strong>Dengan Penyedia Layanan Pihak Ketiga:</strong>{" "}
                      Kami dapat membagikan data Anda dengan vendor pihak ketiga
                      yang melakukan layanan untuk kami, seperti pemrosesan
                      pembayaran dan analisis data.
                    </li>
                  </ul>
                  <p>
                    Kami tidak menjual data pribadi Anda kepada pihak ketiga.
                  </p>
                </Section>

                <Section title="4. Keamanan Informasi Anda">
                  <p>
                    Kami menggunakan langkah-langkah keamanan administratif,
                    teknis, dan fisik untuk membantu melindungi informasi
                    pribadi Anda. Meskipun kami telah mengambil langkah-langkah
                    yang wajar untuk mengamankan data yang Anda berikan kepada
                    kami, perlu diketahui bahwa tidak ada sistem keamanan yang
                    sempurna atau tidak dapat ditembus.
                  </p>
                </Section>

                <Section title="5. Hak Anda">
                  <p>Anda memiliki hak untuk:</p>
                  <ul>
                    <li>
                      Mengakses dan memperbarui informasi akun Anda kapan saja
                      melalui halaman profil Anda.
                    </li>
                    <li>
                      Meminta penghapusan akun dan data pribadi Anda, tunduk
                      pada persyaratan hukum dan operasional kami.
                    </li>
                    <li>
                      Memilih untuk tidak menerima komunikasi pemasaran dari
                      kami.
                    </li>
                  </ul>
                </Section>

                <Section title="6. Kebijakan Mengenai Anak-Anak">
                  <p>
                    Layanan kami tidak ditujukan untuk individu di bawah usia 13
                    tahun. Kami tidak secara sadar mengumpulkan informasi
                    pribadi dari anak-anak di bawah 13 tahun. Jika kami
                    mengetahui bahwa kami telah melakukannya, kami akan
                    mengambil langkah-langkah untuk menghapus informasi
                    tersebut.
                  </p>
                </Section>

                <Section title="7. Perubahan pada Kebijakan Privasi Ini">
                  <p>
                    Kami dapat memperbarui Kebijakan Privasi ini dari waktu ke
                    waktu. Versi yang telah direvisi akan ditandai dengan
                    tanggal "Terakhir diperbarui" yang diperbarui. Kami
                    mendorong Anda untuk meninjau Kebijakan Privasi ini secara
                    berkala untuk tetap mendapat informasi tentang bagaimana
                    kami melindungi informasi Anda.
                  </p>
                </Section>

                <Section title="8. Hubungi Kami">
                  <p>
                    Jika Anda memiliki pertanyaan atau komentar tentang
                    Kebijakan Privasi ini, silakan hubungi kami melalui{" "}
                    <Link to="/#hubungi-kami" className="link-brand">
                      formulir kontak di halaman utama
                    </Link>{" "}
                  </p>
                </Section>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default PrivacyPolicyPage;
