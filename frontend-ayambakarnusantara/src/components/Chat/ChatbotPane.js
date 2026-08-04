import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Button,
  Spinner,
  Form,
  InputGroup,
  Alert,
  Card,
  Image as BootstrapImage,
} from "react-bootstrap";
import { SendFill } from "react-bootstrap-icons";
import { useAuth } from "../../context/AuthContext";
import * as ChatService from "../../services/ChatService";
import "../../css/GlobalChat.css";

const MessageBubble = ({ message, isSender, onSuggestionClick }) => {
  const messageDateObject = message.timestamp
    ? new Date(message.timestamp)
    : null;
  const messageTimestampDisplay = messageDateObject
    ? messageDateObject.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className={`message-bubble-row ${isSender ? "sender" : "receiver"}`}>
      <div className={`message-bubble ${isSender ? "sender" : "receiver"}`}>
        {message.text && message.text.trim() !== "" && (
          <div
            dangerouslySetInnerHTML={{
              __html: message.text.replace(/\n/g, "<br />"),
            }}
            className="message-text mb-1"
          ></div>
        )}
        {message.imageUrl && (
          <BootstrapImage
            src={message.imageUrl}
            alt="Gambar dari chatbot"
            fluid
            rounded
            className="my-2 chatbot-image"
            style={{ maxHeight: "200px", cursor: "pointer", display: "block" }}
            onClick={() => window.open(message.imageUrl, "_blank")}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="chatbot-suggestions mt-2">
            {message.suggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline-light"
                size="sm"
                className="m-1 suggestion-button"
                onClick={() =>
                  onSuggestionClick && onSuggestionClick(suggestion)
                }
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        <small className="message-timestamp">{messageTimestampDisplay}</small>
      </div>
    </div>
  );
};

function ChatbotPane() {
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const loadHistory = async () => {
      if (currentUser?.uid) {
        setIsLoadingHistory(true);
        setError("");
        setMessages([]);
        try {
          const historyResponse = await ChatService.getChatbotHistory(
            currentUser.uid
          );
          if (
            historyResponse &&
            historyResponse.success &&
            Array.isArray(historyResponse.data) &&
            historyResponse.data.length > 0
          ) {
            const formattedHistoryMessages = historyResponse.data.map(
              (item, index) => {
                let textContent = item.text || "";
                let imageUrlContent = item.imageUrl || null;

                if (!imageUrlContent && textContent) {
                  const markdownImageRegex =
                    /(?:!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp))\)|\[[^\]]*?\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp))\))/i;
                  let match = textContent.match(markdownImageRegex);
                  if (match && (match[1] || match[2])) {
                    imageUrlContent = match[1] || match[2];
                    textContent = textContent
                      .replace(markdownImageRegex, "")
                      .trim();
                  } else {
                    const labelAndUrlRegex =
                      /(?:Banner|Foto|Gambar|Link Foto)\s*:\s*(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|jpg)[^\s]*)/i;
                    match = textContent.match(labelAndUrlRegex);
                    if (match && match[1]) {
                      imageUrlContent = match[1];
                      textContent = textContent
                        .replace(labelAndUrlRegex, "")
                        .trim();
                    }
                  }
                  textContent = textContent
                    .replace(
                      /^\s*([*-]|\*\*\w+:\*\*)\s*(Anda bisa melihat gambarnya di)?\s*$/gim,
                      ""
                    )
                    .replace(/\n\s*\n/g, "\n")
                    .trim();
                }

                return {
                  _id: `hist-${item.createdAt || Date.now()}-${index}`,
                  text: textContent,
                  senderUID: item.role === "user" ? currentUser.uid : "chatbot",
                  timestamp: item.createdAt
                    ? new Date(item.createdAt).toISOString()
                    : new Date().toISOString(),
                  suggestions: [],
                  imageUrl: imageUrlContent,
                };
              }
            );
            setMessages(formattedHistoryMessages);
          } else {
            const initialChatbotMessage = {
              _id: `chatbot-initial-${Date.now()}`,
              text: "Halo! Ada yang bisa saya bantu? Anda bisa bertanya tentang menu, rekomendasi, atau informasi toko.",
              senderUID: "chatbot",
              timestamp: new Date().toISOString(),
              suggestions: [
                "cek pesanan saya",
                "cek pembayaran saya",
                "daftar toko",
                "daftar menu",
                "chat penjual",
              ],
            };
            setMessages([initialChatbotMessage]);
            if (historyResponse && !historyResponse.success) {
              setError(historyResponse.message || "Gagal memuat riwayat chat.");
            }
          }
        } catch (err) {
          setError(
            err.message || "Terjadi kesalahan saat memuat riwayat chat."
          );
          const initialChatbotMessage = {
            _id: `chatbot-initial-error-${Date.now()}`,
            text: "Halo! Ada yang bisa saya bantu? Anda bisa bertanya tentang menu, rekomendasi, atau informasi toko.",
            senderUID: "chatbot",
            timestamp: new Date().toISOString(),
            suggestions: [
              "cek pesanan saya",
              "cek pembayaran saya",
              "daftar toko",
              "daftar menu",
              "chat penjual",
            ],
          };
          setMessages([initialChatbotMessage]);
        } finally {
          setIsLoadingHistory(false);
        }
      }
    };
    loadHistory();
  }, [currentUser?.uid]);

  const handleSendToChatbot = async (questionText) => {
    if (!questionText.trim() || !currentUser?.uid) return;
    setIsSending(true);
    setError("");
    const userMessage = {
      _id: `user-${Date.now()}`,
      text: questionText,
      senderUID: currentUser.uid,
      timestamp: new Date().toISOString(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage("");
    try {
      const response = await ChatService.askChatbot({
        question: questionText,
        userId: currentUser.uid,
      });
      if (
        response &&
        response.success &&
        Array.isArray(response.data) &&
        response.data.length > 0
      ) {
        const chatbotMessages = response.data.map((replyPart, index) => {
          let answerText = replyPart.text || "";
          let finalImageUrl = replyPart.imageUrl || null;
          if (answerText.trim().toLowerCase() === "pesan tidak boleh kosong.") {
            answerText =
              "Maaf, ada sedikit kendala pada chatbot. Silakan coba pertanyaan lain.";
            finalImageUrl = null;
          } else if (answerText) {
            if (!finalImageUrl) {
              const markdownImageRegex =
                /(?:!\[.*?\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp))\)|\[[^\]]*?\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp))\))/i;
              let match = answerText.match(markdownImageRegex);
              if (match && (match[1] || match[2])) {
                finalImageUrl = match[1] || match[2];
                answerText = answerText.replace(markdownImageRegex, "").trim();
              } else {
                const labelAndUrlRegex =
                  /(?:Banner|Foto|Gambar|Link Foto)\s*:\s*(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp|jpg)[^\s]*)/i;
                match = answerText.match(labelAndUrlRegex);
                if (match && match[1]) {
                  finalImageUrl = match[1];
                  answerText = answerText.replace(labelAndUrlRegex, "").trim();
                }
              }
            }
            answerText = answerText
              .replace(
                /^\s*([*-]|\*\*\w+:\*\*)\s*(Anda bisa melihat gambarnya di)?\s*$/gim,
                ""
              )
              .replace(/\n\s*\n/g, "\n")
              .trim();
          }
          return {
            _id: `chatbot-${Date.now()}-${index}`,
            text: answerText,
            senderUID: "chatbot",
            timestamp: replyPart.timestamp
              ? new Date(replyPart.timestamp).toISOString()
              : new Date().toISOString(),
            suggestions: [],
            imageUrl: finalImageUrl,
          };
        });
        setMessages((prevMessages) => [...prevMessages, ...chatbotMessages]);
      } else {
        let errorMessageText =
          response?.message || "Gagal mendapatkan jawaban dari chatbot.";
        if (
          errorMessageText.trim().toLowerCase() === "pesan tidak boleh kosong."
        ) {
          errorMessageText =
            "Maaf, ada sedikit kendala pada chatbot. Silakan coba pertanyaan lain.";
        }
        setError(errorMessageText);
        const errorResponse = {
          _id: `error-${Date.now()}`,
          text: errorMessageText,
          senderUID: "chatbot",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prevMessages) => [...prevMessages, errorResponse]);
      }
    } catch (err) {
      let exceptionMessageText =
        err.message ||
        "Terjadi kesalahan pada server saat menghubungi chatbot.";
      if (
        !exceptionMessageText.includes(
          "Question (string) and userId (string) are required."
        ) &&
        exceptionMessageText.trim().toLowerCase() ===
          "pesan tidak boleh kosong."
      ) {
        exceptionMessageText =
          "Maaf, ada sedikit kendala pada chatbot. Silakan coba pertanyaan lain.";
      }
      setError(exceptionMessageText);
      const catchErrorResponse = {
        _id: `catch-error-${Date.now()}`,
        text: exceptionMessageText,
        senderUID: "chatbot",
        timestamp: new Date().toISOString(),
        isError: true,
      };
      setMessages((prevMessages) => [...prevMessages, catchErrorResponse]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitForm = (e) => {
    e.preventDefault();
    handleSendToChatbot(newMessage);
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendToChatbot(suggestion);
  };

  return (
    <>
      <Card.Body className="global-chat-body messages-area d-flex flex-column">
        {isLoadingHistory && (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Memuat riwayat percakapan...</p>
          </div>
        )}
        {error &&
          !isLoadingHistory &&
          !messages.some((msg) => msg.isError && msg.text === error) && (
            <Alert variant="danger" className="m-2 small p-2 text-center">
              {error}
            </Alert>
          )}
        {!isLoadingHistory &&
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isSender={msg.senderUID === currentUser?.uid}
              onSuggestionClick={handleSuggestionClick}
            />
          ))}
        {isSending &&
          messages.length > 0 &&
          messages[messages.length - 1]?.senderUID === currentUser?.uid && (
            <div className="d-flex justify-content-start mt-2 ms-2">
              <Spinner animation="grow" size="sm" variant="secondary" />
            </div>
          )}
        <div ref={messagesEndRef} />
      </Card.Body>
      <Card.Footer className="global-chat-footer p-2">
        <Form onSubmit={handleSubmitForm}>
          <InputGroup>
            <Form.Control
              type="text"
              placeholder="Tanya chatbot..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending || isLoadingHistory}
              className="chat-input"
              autoComplete="off"
              aria-label="Chatbot input"
            />
            <Button
              variant="primary"
              type="submit"
              disabled={isSending || isLoadingHistory || !newMessage.trim()}
              className="btn-brand chat-send-button"
              aria-label="Send message to chatbot"
            >
              {isSending ? (
                <Spinner as="span" animation="border" size="sm" />
              ) : (
                <SendFill />
              )}
            </Button>
          </InputGroup>
        </Form>
      </Card.Footer>
    </>
  );
}

export default ChatbotPane;
