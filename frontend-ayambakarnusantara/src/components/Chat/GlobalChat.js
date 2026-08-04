import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Card,
  Spinner,
  ListGroup,
  Image,
  Form,
  InputGroup,
  Alert,
  Dropdown,
  Modal,
} from "react-bootstrap";
import {
  ChatDots,
  XLg,
  SendFill,
  ArrowLeftShort,
  PersonFill,
  Robot,
  ThreeDotsVertical,
  Paperclip,
  GeoAltFill,
  PlusCircleFill,
} from "react-bootstrap-icons";
import { useAuth } from "../../context/AuthContext";
import * as ChatService from "../../services/ChatService";
import ChatbotPane from "./ChatbotPane";
import "../../css/GlobalChat.css";

const MAPS_API_KEY = process.env.REACT_APP_Maps_API_KEY || "YOUR_Maps_API_KEY";

function firestoreTimestampToDate(tsObject) {
  if (!tsObject) return null;
  if (tsObject instanceof Date) return tsObject;
  if (typeof tsObject === "string") {
    const date = new Date(tsObject);
    if (!isNaN(date.getTime())) return date;
  }
  if (typeof tsObject._seconds === "number") {
    return new Date(
      tsObject._seconds * 1000 + (tsObject._nanoseconds || 0) / 1000000
    );
  }
  return null;
}

const ConfirmationModal = ({ show, message, onConfirm, onCancel }) => {
  if (!show) return null;

  return (
    <Modal show={show} onHide={onCancel} centered size="sm">
      <Modal.Body className="text-center p-4">
        <p className="mb-4">{message}</p>
        <Button variant="secondary" onClick={onCancel} className="me-2">
          Batal
        </Button>
        <Button variant="primary" onClick={onConfirm} className="btn-brand">
          Kirim
        </Button>
      </Modal.Body>
    </Modal>
  );
};

const ConversationItem = ({
  conversation,
  onSelect,
  isActive,
  currentUserUID,
}) => {
  const otherParticipantUID = conversation.participantUIDs.find(
    (uid) => uid !== currentUserUID
  );
  const otherParticipantInfo =
    conversation.participantInfo &&
    conversation.participantInfo[otherParticipantUID];
  const displayName =
    otherParticipantInfo?.displayName || "Pengguna Tidak Dikenal";
  const photoURL = otherParticipantInfo?.photoURL;

  let lastMessageDisplay = "Belum ada pesan.";
  if (conversation.lastMessage) {
    switch (conversation.lastMessage.type) {
      case "image":
        lastMessageDisplay = conversation.lastMessage.text || "Gambar";
        break;
      case "location":
        lastMessageDisplay = "Lokasi";
        break;
      default:
        lastMessageDisplay = conversation.lastMessage.text || "Pesan baru";
    }
  }

  const lastMessageDateObject = conversation.lastMessage?.timestamp
    ? firestoreTimestampToDate(conversation.lastMessage.timestamp)
    : null;
  const lastMessageTimestamp = lastMessageDateObject
    ? lastMessageDateObject.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <ListGroup.Item
      action
      onClick={() => onSelect(conversation)}
      active={isActive}
      className="conversation-item"
    >
      <div className="d-flex align-items-center">
        <Image
          src={
            photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              displayName
            )}&background=C07722&color=fff&size=40`
          }
          roundedCircle
          width="40"
          height="40"
          className="me-3 conversation-avatar flex-shrink-0"
          alt={`Avatar ${displayName}`}
        />
        <div className="conversation-info flex-grow-1">
          <div className="d-flex justify-content-between align-items-start">
            <strong className="conversation-name text-truncate">
              {displayName}
            </strong>
            <small className="text-muted conversation-timestamp ms-2">
              {lastMessageTimestamp}
            </small>
          </div>
          <small className="text-muted conversation-last-message text-truncate d-block">
            {conversation.lastMessage?.senderUID === currentUserUID && "Anda: "}
            {lastMessageDisplay}
          </small>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const MessageBubble = ({ message, isSender }) => {
  let messageDateObject = firestoreTimestampToDate(message.timestamp);

  const messageTimestampDisplay =
    messageDateObject && !isNaN(messageDateObject.getTime())
      ? messageDateObject.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  const messageTextHtml = message.text
    ? message.text.replace(/\n/g, "<br />")
    : "";

  const renderLocation = () => {
    if (!message.location) return null;
    const { latitude, longitude } = message.location;
    const gmapsUrl = `https://www.google.com/maps/search/?api=1&query=$${latitude},${longitude}`;

    if (MAPS_API_KEY === "YOUR_Maps_API_KEY") {
      return (
        <a
          href={gmapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="chat-location-link-no-api"
        >
          <GeoAltFill className="me-2" />
          <span>Lokasi dibagikan</span>
          <small className="d-block">Klik untuk membuka di Maps</small>
        </a>
      );
    }
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=15&size=300x200&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=${MAPS_API_KEY}`;

    return (
      <a
        href={gmapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-location-link"
      >
        <Image
          src={staticMapUrl}
          alt={`Peta lokasi di ${latitude}, ${longitude}`}
          fluid
          rounded
          className="my-2 chat-message-location"
        />
        <div className="location-text">
          <GeoAltFill className="me-1" /> Lihat di Google Maps
        </div>
      </a>
    );
  };

  return (
    <div className={`message-bubble-row ${isSender ? "sender" : "receiver"}`}>
      <div className={`message-bubble ${isSender ? "sender" : "receiver"}`}>
        {message.text && message.text.trim() !== "" && (
          <div
            dangerouslySetInnerHTML={{ __html: messageTextHtml }}
            className="message-text mb-1"
          ></div>
        )}
        {message.imageUrl && (
          <Image
            src={message.imageUrl}
            alt="Gambar terkirim"
            fluid
            rounded
            className="my-2 chat-message-image"
            style={{ maxHeight: "250px", cursor: "pointer" }}
            onClick={() => window.open(message.imageUrl, "_blank")}
          />
        )}
        {message.type === "location" && renderLocation()}
        <small className="message-timestamp">{messageTimestampDisplay}</small>
      </div>
    </div>
  );
};

function GlobalChat({
  conversationToLoad,
  recipientToInitiateChat,
  onChatInitiated,
  onRequestClose,
}) {
  const { user: currentUser, isLoggedIn } = useAuth();
  // PENJELASAN: Mode default adalah 'chatbot' untuk menjaga prioritas.
  const [chatMode, setChatMode] = useState("chatbot");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isInitiatingChat, setIsInitiatingChat] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [confirmation, setConfirmation] = useState({
    show: false,
    message: "",
    action: null,
  });
  const [errorConversations, setErrorConversations] = useState("");
  const [errorMessages, setErrorMessages] = useState("");
  const [errorSending, setErrorSending] = useState("");
  const [errorInitiating, setErrorInitiating] = useState("");
  const currentUserUID = currentUser?.uid;
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // PERBAIKAN: Hook ini secara spesifik menangani props yang masuk
  // untuk membuka chat tertentu, memastikan `chatMode` diubah ke 'seller'.
  useEffect(() => {
    if (conversationToLoad || recipientToInitiateChat) {
      setChatMode("seller");
    }
  }, [conversationToLoad, recipientToInitiateChat]);

  const sortConversations = (convos) => {
    return [...convos].sort((a, b) => {
      const dateA = a.updatedAt
        ? firestoreTimestampToDate(a.updatedAt)?.getTime() || 0
        : 0;
      const dateB = b.updatedAt
        ? firestoreTimestampToDate(b.updatedAt)?.getTime() || 0
        : 0;
      return dateB - dateA;
    });
  };

  const loadConversations = useCallback(async () => {
    if (!isLoggedIn || !currentUserUID) return;
    setIsLoadingConversations(true);
    setErrorConversations("");
    try {
      const response = await ChatService.getAllConversations();
      if (response && response.success === true) {
        setConversations(sortConversations(response.data || []));
      } else {
        setErrorConversations(response?.message || "Gagal memuat percakapan.");
        setConversations([]);
      }
    } catch (err) {
      setErrorConversations(
        err.message || "Terjadi kesalahan saat memuat percakapan."
      );
      setConversations([]);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [isLoggedIn, currentUserUID]);

  // PENJELASAN: Hook ini akan berjalan ketika `chatMode` berubah menjadi 'seller'.
  useEffect(() => {
    if (isLoggedIn && chatMode === "seller") {
      loadConversations();
    } else if (!isLoggedIn) {
      setConversations([]);
      setSelectedConversation(null);
      setMessages([]);
    }
  }, [isLoggedIn, chatMode, loadConversations]);

  // PENJELASAN: Hook ini sekarang akan berjalan setelah `conversations` terisi,
  // lalu memilih percakapan yang benar berdasarkan `conversationToLoad`.
  useEffect(() => {
    if (conversationToLoad && conversations.length > 0) {
      const targetConversation = conversations.find(
        (c) => c._id === conversationToLoad
      );
      if (targetConversation) {
        setSelectedConversation(targetConversation);
      }
    }
  }, [conversationToLoad, conversations]);

  const loadMessages = useCallback(
    async (conversationId, loadMore = false, currentMessagesState = []) => {
      if (!conversationId || chatMode !== "seller") return;
      setIsLoadingMessages(true);
      setErrorMessages("");
      try {
        const params = { limit: 20 };
        if (loadMore && currentMessagesState.length > 0) {
          const oldestMessageTimestamp = currentMessagesState[0]?.timestamp;
          let tsValue =
            oldestMessageTimestamp instanceof Date
              ? oldestMessageTimestamp.toISOString()
              : oldestMessageTimestamp;
          if (tsValue) {
            params.beforeTimestamp = tsValue;
          }
        }
        const response = await ChatService.getMessages(conversationId, params);
        if (response && response.success === true && response.data) {
          const newMessages = response.data.map((msg) => ({
            ...msg,
            timestamp: firestoreTimestampToDate(msg.timestamp),
          }));
          setMessages((prevMessages) =>
            loadMore ? [...newMessages, ...prevMessages] : newMessages
          );
          if (!loadMore) {
            setTimeout(scrollToBottom, 0);
          }
        } else {
          setErrorMessages(response?.message || "Gagal memuat pesan.");
        }
      } catch (err) {
        setErrorMessages(err.message || "Terjadi kesalahan saat memuat pesan.");
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [scrollToBottom, chatMode]
  );

  useEffect(() => {
    if (chatMode === "seller" && selectedConversation?._id) {
      setMessages([]);
      loadMessages(selectedConversation._id, false, []);
    } else {
      // Membersihkan pesan jika tidak ada percakapan yang dipilih atau mode bukan seller
      setMessages([]);
    }
  }, [selectedConversation?._id, chatMode, loadMessages]);

  useEffect(() => {
    let isMounted = true;
    const initiateNewChat = async (targetUID) => {
      if (!isLoggedIn || !currentUserUID) return;
      if (
        selectedConversation &&
        selectedConversation.participantUIDs.includes(targetUID) &&
        selectedConversation.participantUIDs.includes(currentUserUID)
      ) {
        if (onChatInitiated) onChatInitiated(selectedConversation);
        return;
      }
      setIsInitiatingChat(true);
      setErrorInitiating("");
      try {
        const response = await ChatService.startOrGetConversation(targetUID);
        if (!isMounted) return;
        if (response && response.success === true && response.data) {
          const newOrExistingConvo = response.data;
          setConversations((prevConvos) => {
            const existingIndex = prevConvos.findIndex(
              (c) => c._id === newOrExistingConvo._id
            );
            let updatedConvos =
              existingIndex > -1
                ? prevConvos.map((c) =>
                    c._id === newOrExistingConvo._id ? newOrExistingConvo : c
                  )
                : [newOrExistingConvo, ...prevConvos];
            return sortConversations(updatedConvos);
          });
          setSelectedConversation(newOrExistingConvo);
          if (onChatInitiated) onChatInitiated(newOrExistingConvo);
        } else {
          setErrorInitiating(response?.message || "Gagal memulai percakapan.");
        }
      } catch (err) {
        if (!isMounted) return;
        setErrorInitiating(
          err.message || "Terjadi kesalahan server saat memulai percakapan."
        );
      } finally {
        if (isMounted) setIsInitiatingChat(false);
      }
    };

    if (recipientToInitiateChat) {
      initiateNewChat(recipientToInitiateChat);
    }
    return () => {
      isMounted = false;
    };
  }, [
    recipientToInitiateChat,
    isLoggedIn,
    currentUserUID,
    onChatInitiated,
    selectedConversation,
  ]);

  const handleSelectConversation = (conversation) => {
    if (
      chatMode === "seller" &&
      selectedConversation?._id !== conversation._id
    ) {
      setSelectedConversation(conversation);
    }
  };

  const handleDeselectConversation = () => {
    if (isMobileView && chatMode === "seller") {
      setSelectedConversation(null);
    }
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file tidak boleh melebihi 5MB.");
        return;
      }
      setImagePreviewUrl(URL.createObjectURL(file));
      setImageFile(file);
      setShowAttachmentOptions(false);
    }
  };

  const removeImagePreview = () => {
    setImagePreviewUrl("");
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirm = () => {
    if (confirmation.action) {
      confirmation.action();
    }
    setConfirmation({ show: false, message: "", action: null });
  };

  const sendMessageOptimistically = async (messagePayload) => {
    if (
      chatMode !== "seller" ||
      !selectedConversation?._id ||
      !currentUserUID
    ) {
      return;
    }

    setIsSendingMessage(true);
    setErrorSending("");

    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempMessageId,
      senderUID: currentUserUID,
      text: messagePayload.text || null,
      imageUrl: messagePayload.image
        ? URL.createObjectURL(messagePayload.image)
        : null,
      location: messagePayload.location || null,
      timestamp: new Date(),
      type: messagePayload.location
        ? "location"
        : messagePayload.image
        ? "image"
        : "text",
      status: "sending",
    };

    setMessages((prevMessages) => [...prevMessages, optimisticMessage]);

    if (messagePayload.text) setNewMessage("");
    if (messagePayload.image) {
      setImagePreviewUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }

    setTimeout(scrollToBottom, 0);

    try {
      const response = await ChatService.sendMessage(
        selectedConversation._id,
        messagePayload
      );

      if (response && response.success && response.data) {
        const sentMessage = {
          ...response.data,
          timestamp: firestoreTimestampToDate(response.data.timestamp),
          status: "sent",
        };
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg._id === tempMessageId ? sentMessage : msg
          )
        );
        setConversations((prevConvos) =>
          sortConversations(
            prevConvos.map((convo) =>
              convo._id === selectedConversation._id
                ? {
                    ...convo,
                    lastMessage: response.data,
                    updatedAt: response.data.timestamp,
                  }
                : convo
            )
          )
        );
      } else {
        throw new Error(response?.message || "Gagal mengirim pesan.");
      }
    } catch (err) {
      setErrorSending(err.message || "Terjadi kesalahan server.");
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg._id === tempMessageId
            ? { ...msg, status: "failed", error: err.message }
            : msg
        )
      );
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendLocation = () => {
    setShowAttachmentOptions(false);
    if (!navigator.geolocation) {
      setErrorSending("Geolocation tidak didukung oleh browser Anda.");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setConfirmation({
          show: true,
          message: "Anda yakin ingin mengirim lokasi saat ini?",
          action: () =>
            sendMessageOptimistically({ location: { latitude, longitude } }),
        });
        setIsGettingLocation(false);
      },
      (error) => {
        setErrorSending(`Gagal mendapatkan lokasi: ${error.message}`);
        setIsGettingLocation(false);
      }
    );
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (imageFile) {
      sendMessageOptimistically({ image: imageFile });
      setImageFile(null);
    } else if (newMessage.trim()) {
      sendMessageOptimistically({ text: newMessage.trim() });
    }
  };

  const getOtherParticipantDisplayInfo = (conversation) => {
    if (!conversation || !conversation.participantInfo || !currentUserUID)
      return "Chat";
    const otherParticipantUID = conversation.participantUIDs.find(
      (uid) => uid !== currentUserUID
    );
    const participant = conversation.participantInfo[otherParticipantUID];
    return participant?.displayName || "Pengguna";
  };

  const handleChatModeChange = (mode) => {
    if (chatMode !== mode) {
      setChatMode(mode);
      setSelectedConversation(null);
      setMessages([]);
      setErrorMessages("");
      setErrorSending("");
    }
  };

  const headerTitle =
    chatMode === "chatbot"
      ? "Chatbot Bantuan"
      : selectedConversation && chatMode === "seller"
      ? getOtherParticipantDisplayInfo(selectedConversation)
      : "Percakapan Penjual";
  const showConversationListPanel =
    chatMode === "seller" &&
    (!isMobileView || (isMobileView && !selectedConversation));
  const showMessagePanel =
    chatMode === "chatbot" || (chatMode === "seller" && selectedConversation);

  return (
    <>
      <ConfirmationModal
        show={confirmation.show}
        message={confirmation.message}
        onConfirm={handleConfirm}
        onCancel={() =>
          setConfirmation({ show: false, message: "", action: null })
        }
      />
      <Card className="global-chat-window-modal-version shadow-lg">
        <Card.Header className="global-chat-header">
          <div className="chat-header-left">
            {chatMode === "seller" && selectedConversation && isMobileView && (
              <Button
                variant="link"
                className="p-0 text-white me-2 back-to-conversations-button"
                onClick={handleDeselectConversation}
                title="Kembali ke Daftar Percakapan"
              >
                <ArrowLeftShort size={26} />
              </Button>
            )}
            <span className="chat-title-text">{headerTitle}</span>
          </div>
          <div className="chat-header-right">
            <Dropdown align="end" className="chat-mode-dropdown">
              <Dropdown.Toggle
                variant="link"
                id="dropdown-chat-mode-options"
                className="p-0 text-white"
              >
                <ThreeDotsVertical size={20} />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() => handleChatModeChange("chatbot")}
                  active={chatMode === "chatbot"}
                >
                  <Robot className="me-2" /> Chat dengan Chatbot
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => handleChatModeChange("seller")}
                  active={chatMode === "seller"}
                >
                  <PersonFill className="me-2" /> Chat dengan Penjual
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            <Button
              variant="link"
              className="p-0 text-white close-chat-button ms-2"
              onClick={onRequestClose}
              title="Tutup Chat"
            >
              <XLg size={18} />
            </Button>
          </div>
        </Card.Header>
        <div className="global-chat-main-content">
          {showConversationListPanel && (
            <div
              className={`conversation-list-panel ${
                selectedConversation && isMobileView
                  ? "minimized-on-mobile"
                  : ""
              }`}
            >
              {isInitiatingChat || isLoadingConversations ? (
                <div className="text-center py-5">
                  <Spinner animation="border" size="sm" />
                  <p className="mb-0 mt-2 small">
                    {isInitiatingChat
                      ? "Memulai chat..."
                      : "Memuat percakapan..."}
                  </p>
                </div>
              ) : conversations.length > 0 ? (
                <ListGroup
                  variant="flush"
                  className="conversation-list-scrollable"
                >
                  {conversations.map((convo) => (
                    <ConversationItem
                      key={convo._id}
                      conversation={convo}
                      onSelect={handleSelectConversation}
                      isActive={selectedConversation?._id === convo._id}
                      currentUserUID={currentUserUID}
                    />
                  ))}
                </ListGroup>
              ) : (
                !errorConversations &&
                !errorInitiating && (
                  <p className="text-center text-muted p-3 small">
                    Belum ada percakapan dengan penjual.
                  </p>
                )
              )}
            </div>
          )}
          {showMessagePanel && (
            <div
              className={`message-panel ${
                isMobileView && !showConversationListPanel
                  ? "active-mobile-full"
                  : ""
              }`}
            >
              {chatMode === "seller" ? (
                selectedConversation ? (
                  <>
                    <Card.Body className="global-chat-body messages-area">
                      {errorMessages && (
                        <Alert
                          variant="warning"
                          className="small p-2 text-center"
                          onClose={() => setErrorMessages("")}
                          dismissible
                        >
                          {errorMessages}
                        </Alert>
                      )}
                      {messages.map((msg) => (
                        <MessageBubble
                          key={msg._id}
                          message={msg}
                          isSender={msg.senderUID === currentUserUID}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </Card.Body>
                    <Card.Footer className="global-chat-footer p-2">
                      <div className="attachment-options-container">
                        {showAttachmentOptions && (
                          <div className="attachment-options">
                            <Button
                              variant="light"
                              className="attachment-button"
                              onClick={() => fileInputRef.current.click()}
                            >
                              <Paperclip size={20} />
                              <span>Gambar</span>
                            </Button>
                            <Button
                              variant="light"
                              className="attachment-button"
                              onClick={handleSendLocation}
                            >
                              <GeoAltFill size={20} />
                              <span>Lokasi</span>
                            </Button>
                          </div>
                        )}
                      </div>
                      {imagePreviewUrl && (
                        <div className="image-preview-container mb-2">
                          <Image
                            src={imagePreviewUrl}
                            thumbnail
                            fluid
                            style={{ maxHeight: "80px" }}
                          />
                          <Button
                            variant="close"
                            onClick={removeImagePreview}
                            aria-label="Hapus gambar pratinjau"
                          />
                        </div>
                      )}
                      {errorSending && (
                        <Alert
                          variant="danger"
                          className="small p-1 mb-1 text-center"
                          onClose={() => setErrorSending("")}
                          dismissible
                        >
                          {errorSending}
                        </Alert>
                      )}
                      <Form onSubmit={handleSendMessage} className="w-100">
                        <InputGroup>
                          <Button
                            variant="light"
                            className="chat-attach-button"
                            onClick={() =>
                              setShowAttachmentOptions(!showAttachmentOptions)
                            }
                          >
                            <PlusCircleFill />
                          </Button>
                          <Form.Control
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImageFileChange}
                            style={{ display: "none" }}
                            accept="image/*"
                          />
                          <Form.Control
                            type="text"
                            placeholder={
                              imageFile
                                ? "Kirim gambar yang dipilih"
                                : "Ketik pesan..."
                            }
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            disabled={
                              imageFile ||
                              isLoadingMessages ||
                              !selectedConversation ||
                              isGettingLocation
                            }
                            className="chat-input"
                            autoComplete="off"
                          />
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={
                              (!newMessage.trim() && !imageFile) ||
                              !selectedConversation ||
                              isGettingLocation ||
                              isSendingMessage
                            }
                            className="btn-brand chat-send-button"
                          >
                            {isSendingMessage ? (
                              <Spinner as="span" animation="border" size="sm" />
                            ) : (
                              <SendFill />
                            )}
                          </Button>
                        </InputGroup>
                      </Form>
                    </Card.Footer>
                  </>
                ) : (
                  <div className="no-conversation-selected">
                    <ChatDots size={52} className="text-muted mb-3" />
                    <p className="text-muted">
                      Pilih percakapan untuk memulai.
                    </p>
                  </div>
                )
              ) : (
                <ChatbotPane />
              )}
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

export default GlobalChat;
