import React, { useState, useEffect } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";
import { Alert, Container, Modal, Spinner, Button } from "react-bootstrap";
import { ChatDots } from "react-bootstrap-icons";
import "./App.css";
import NavigationBar from "./components/Layout/NavigationBar";
import Footer from "./components/Layout/Footer";
import GlobalChat from "./components/Chat/GlobalChat";
import HomePage from "./pages/HomePage";
import LoginForm from "./components/Auth/LoginForm";
import RegisterForm from "./components/Auth/RegisterForm";
import ForgotPasswordForm from "./components/Auth/ForgotPasswordForm";
import { useAuth } from "./context/AuthContext";
import MenuPage from "./pages/MenuPage";
import DetailMenuPage from "./pages/DetailMenuPage";
import ShopPage from "./pages/ShopPage";
import ShopDetailPage from "./pages/ShopDetailPage";
import OrderPage from "./pages/OrderPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SellerPage from "./pages/Seller/SellerPage";
import SellerDashboardOverview from "./pages/Seller/SellerDashboardOverview";
import SellerShopInfo from "./pages/Seller/SellerShopInfo";
import SellerProductManagement from "./pages/Seller/SellerProductManagement";
import SellerOrderManagement from "./pages/Seller/SellerOrderManagement";
import CartPage from "./pages/CartPage";
import NotFoundPage from "./pages/NotFoundPage";
import { registerFCMToken } from "./services/ProfileService";
import { getFCMToken } from "./firebase-config";
import NotificationPage from "./pages/NotificationPage";
import ScrollToAnchor from "./utils/ScrollToAnchor";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";

function App() {
  const { isLoggedIn, isLoading, user } = useAuth();
  const [showTopBanner, setShowTopBanner] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showGlobalChatModal, setShowGlobalChatModal] = useState(false);
  const [recipientForChat, setRecipientForChat] = useState(null);
  const [conversationToOpen, setConversationToOpen] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthModalOpen =
    showLoginModal || showRegisterModal || showForgotPasswordModal;

  useEffect(() => {
    const setupAndRegisterFCM = async () => {
      if (isLoggedIn && user) {
        try {
          const currentToken = await getFCMToken();
          if (currentToken) {
            await registerFCMToken({ token: currentToken });
          }
        } catch (error) {
          console.error("Gagal melakukan setup FCM:", error);
        }
      }
    };

    if (!isLoading) {
      setupAndRegisterFCM();
    }
  }, [isLoggedIn, isLoading, user]);

  useEffect(() => {
    if (location.pathname === "/login") {
      setShowRegisterModal(false);
      setShowForgotPasswordModal(false);
      setShowLoginModal(true);
    } else if (location.pathname === "/register") {
      setShowLoginModal(false);
      setShowForgotPasswordModal(false);
      setShowRegisterModal(true);
    } else if (location.pathname === "/forgot-password") {
      setShowLoginModal(false);
      setShowRegisterModal(false);
      setShowForgotPasswordModal(true);
    } else {
      setShowLoginModal(false);
      setShowRegisterModal(false);
      setShowForgotPasswordModal(false);
    }
  }, [location.pathname, navigate]);

  const handleLoginModalClose = () => {
    navigate("/", { replace: true });
  };

  const handleRegisterModalClose = () => {
    navigate("/", { replace: true });
  };

  const handleForgotPasswordModalClose = () => {
    navigate("/login", { replace: true });
  };

  const handleInitiateChatWith = (recipientUID) => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { from: location, message: "Silakan login untuk memulai chat." },
      });
      return;
    }
    setRecipientForChat(recipientUID);
    setShowGlobalChatModal(true);
  };

  const handleOpenChatConversation = (conversationId) => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { from: location, message: "Silakan login untuk melihat chat." },
      });
      return;
    }
    setRecipientForChat(null);
    setConversationToOpen(conversationId);
    setShowGlobalChatModal(true);
  };

  const handleChatSessionInitiated = () => {
    setRecipientForChat(null);
    setConversationToOpen(null);
  };

  const pathsWithFooter = [
    "/",
    "/menu",
    "/menu/:productId",
    "/toko",
    "/toko/:shopId",
    "/pesanan",
  ];
  const isDynamicPathMatch = (pathname, pattern) => {
    const patternParts = pattern.split("/");
    const pathParts = pathname.split("/");
    if (patternParts.length !== pathParts.length) return false;
    return patternParts.every(
      (part, index) => part.startsWith(":") || part === pathParts[index]
    );
  };
  const shouldShowFooter = pathsWithFooter.some((pattern) =>
    pattern.includes(":")
      ? isDynamicPathMatch(location.pathname, pattern)
      : location.pathname === pattern
  );

  const handleOpenChatbot = () => {
    setConversationToOpen(null);
    setRecipientForChat(null);
    setShowGlobalChatModal(true);
  };

  if (isLoading) {
    return (
      <Container
        fluid
        className="d-flex justify-content-center align-items-center"
        style={{ height: "100vh" }}
      >
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Memuat...</span>
        </Spinner>
      </Container>
    );
  }

  return (
    <div className="d-flex flex-column min-vh-100 app-container">
      <ScrollToAnchor />
      {!isLoggedIn && showTopBanner && (
        <Alert
          variant="dark"
          onClose={() => setShowTopBanner(false)}
          dismissible
          className="text-center mb-0 small-banner"
        >
          <Alert.Heading as="span" style={{ fontSize: "0.9rem" }}>
            Daftar Sekarang! untuk bisa pesan ayam bakar kesukaanmu.{" "}
            <Link to="/register" className="alert-link">
              Klik di sini!
            </Link>
          </Alert.Heading>
        </Alert>
      )}
      <NavigationBar isAuthModalOpen={isAuthModalOpen} />
      <Container fluid className="page-content-container p-0 flex-grow-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/register" element={<HomePage />} />
          <Route path="/forgot-password" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:productId" element={<DetailMenuPage />} />
          <Route path="/toko" element={<ShopPage />} />
          <Route
            path="/toko/:shopId"
            element={<ShopDetailPage onInitiateChat={handleInitiateChatWith} />}
          />
          <Route
            path="/pesanan"
            element={
              isLoggedIn ? <OrderPage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/pesanan/:orderId"
            element={
              isLoggedIn ? (
                <OrderDetailPage onOpenChatbot={handleOpenChatbot} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isLoggedIn ? <ProfilePage /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/toko-saya/*"
            element={
              isLoggedIn ? (
                <SellerPage />
              ) : (
                <Navigate to="/login" state={{ from: "/toko-saya" }} replace />
              )
            }
          >
            <Route index element={<SellerDashboardOverview />} />
            <Route path="info" element={<SellerShopInfo />} />
            <Route path="produk" element={<SellerProductManagement />} />
            <Route path="pesanan" element={<SellerOrderManagement />} />
          </Route>
          <Route
            path="/keranjang"
            element={
              isLoggedIn ? (
                <CartPage />
              ) : (
                <Navigate to="/login" state={{ from: "/keranjang" }} replace />
              )
            }
          />
          <Route
            path="/notifikasi"
            element={
              isLoggedIn ? (
                <NotificationPage
                  onNavigateToChat={handleOpenChatConversation}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/syarat-ketentuan" element={<TermsConditionsPage />} />
          <Route path="/kebijakan-privasi" element={<PrivacyPolicyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>

      {shouldShowFooter && <Footer onOpenChatbot={handleOpenChatbot} />}

      <Modal
        show={showLoginModal}
        onHide={handleLoginModalClose}
        centered
        animation={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <LoginForm key={location.key} />
        </Modal.Body>
      </Modal>
      <Modal
        show={showRegisterModal}
        onHide={handleRegisterModalClose}
        centered
        animation={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Register</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <RegisterForm />
        </Modal.Body>
      </Modal>
      <Modal
        show={showForgotPasswordModal}
        onHide={handleForgotPasswordModalClose}
        centered
        animation={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>Lupa Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <ForgotPasswordForm />
        </Modal.Body>
      </Modal>

      {isLoggedIn && (
        <>
          {!showGlobalChatModal && (
            <Button
              variant="primary"
              className="global-chat-app-toggle-button btn-brand shadow"
              onClick={() => {
                setRecipientForChat(null);
                setConversationToOpen(null);
                setShowGlobalChatModal(true);
              }}
              title="Buka Chat"
            >
              <ChatDots size={28} />
            </Button>
          )}

          <Modal
            show={showGlobalChatModal}
            onHide={() => {
              setShowGlobalChatModal(false);
              setRecipientForChat(null);
              setConversationToOpen(null);
            }}
            dialogClassName="global-chat-modal-dialog"
            contentClassName="global-chat-modal-content"
            scrollable={false}
            backdrop={true}
            keyboard={false}
            aria-labelledby="global-chat-modal-title"
          >
            <Modal.Body className="p-0 global-chat-modal-body">
              <GlobalChat
                conversationToLoad={conversationToOpen}
                recipientToInitiateChat={recipientForChat}
                onChatInitiated={handleChatSessionInitiated}
                onRequestClose={() => {
                  setShowGlobalChatModal(false);
                  setRecipientForChat(null);
                  setConversationToOpen(null);
                }}
              />
            </Modal.Body>
          </Modal>
        </>
      )}
    </div>
  );
}

export default App;
