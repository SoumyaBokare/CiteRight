"use client"

import React, { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./chatroom.css"

// Helper function to create elements without JSX
function createElement(type, props = {}, ...children) {
  return React.createElement(type, props, ...children)
}

// Upload Screen Component
const UploadScreen = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef(null)

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file) => {
    setFileName(file.name)

    // Automatically upload the selected file
    handleFileUpload(file)
  }

  const onButtonClick = () => {
    fileInputRef.current.click()
  }

  // Handle file upload to backend
  const handleFileUpload = (file) => {
    // FormData to send the file to the backend
    const formData = new FormData();
    formData.append("paper", file);

    // Upload the file to the server
    fetch("http://localhost:3001/api/upload", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          console.log("File uploaded successfully", data);
          // Store both file and documentId
          const fileWithId = {
            ...file,
            documentId: data.documentId,
            name: file.name
          };
          // Call the callback with the uploaded file data including documentId
          onFileUpload(fileWithId);
        } else {
          console.error("File upload failed", data.error);
          alert("Failed to upload file: " + (data.error || "Unknown error"));
        }
      })
      .catch((error) => {
        console.error("Error uploading file", error);
        alert("Error uploading file. Please try again.");
      });
  }

  return createElement(
    "div",
    { className: "upload-screen" },
    createElement(
      "div",
      {
        className: `upload-container ${dragActive ? "drag-active" : ""}`,
        onDragEnter: handleDrag,
        onDragLeave: handleDrag,
        onDragOver: handleDrag,
        onDrop: handleDrop,
      },
      createElement(
        "div",
        { className: "upload-content" },
        createElement("div", { className: "upload-icon" }, "📄"),
        createElement("h2", { className: "upload-title" }, "Upload Your Research Paper"),
        createElement("p", { className: "upload-description" }, "Drag and drop your PDF file here, or click to browse"),
        createElement("button", { className: "upload-button", onClick: onButtonClick }, "Select PDF File"),
        createElement("input", {
          ref: fileInputRef,
          type: "file",
          className: "file-input",
          accept: ".pdf",
          onChange: handleChange,
        }),
        fileName &&
          createElement(
            "div",
            { className: "file-info" },
            createElement("span", { className: "file-name" }, fileName),
            createElement("div", { className: "upload-progress" }),
          ),
      ),
    ),
  )
}

// Message Component
const Message = ({ message, isUser }) => {
  return createElement(
    "div",
    { className: `message ${isUser ? "user-message" : "bot-message"}` },
    createElement("div", { className: "message-avatar" }, isUser ? "👤" : "🤖"),
    createElement(
      "div",
      { className: "message-content" },
      createElement("div", { className: "message-text" }, message.text),
      createElement("div", { className: "message-time" }, formatTime(message.timestamp)),
    ),
  )
}

// Typing Indicator Component
const TypingIndicator = () => {
  return createElement(
    "div",
    { className: "message bot-message" },
    createElement("div", { className: "message-avatar" }, "🤖"),
    createElement(
      "div",
      { className: "message-content" },
      createElement(
        "div",
        { className: "typing-indicator" },
        createElement("span", { className: "dot" }),
        createElement("span", { className: "dot" }),
        createElement("span", { className: "dot" }),
      ),
    ),
  )
}

// Format timestamp to readable time
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// Chat Summary Item Component
const ChatSummaryItem = ({ title, active, onClick }) => {
  return createElement(
    "div",
    {
      className: `chat-summary-item ${active ? "active" : ""}`,
      onClick: onClick,
    },
    createElement("div", { className: "chat-summary-icon" }, "📄"),
    createElement("div", { className: "chat-summary-title" }, title),
  )
}

// Main Chat Interface Component
const ChatInterface = () => {
  const [showUpload, setShowUpload] = useState(true)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [currentPaper, setCurrentPaper] = useState(null)
  const [chatSummaries, setChatSummaries] = useState([{ id: 1, title: "New Chat" }])
  const [activeChatId, setActiveChatId] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const navigate = useNavigate() // Use useNavigate for navigation

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Handle file upload
  const handleFileUpload = (file) => {
    setCurrentPaper(file)
    setShowUpload(false)

    // Add welcome message from bot
    const welcomeMessage = {
      id: Date.now(),
      text: `I've analyzed your paper "${file.name}". What would you like to know about it?`,
      isUser: false,
      timestamp: Date.now(),
    }

    setMessages([welcomeMessage])

    // Update chat summaries
    const newChat = {
      id: Date.now(),
      title: file.name.length > 20 ? file.name.substring(0, 20) + "..." : file.name,
    }

    setChatSummaries([...chatSummaries, newChat])
    setActiveChatId(newChat.id)
  }

  // Handle sending a message
  const handleSendMessage = () => {
    if (inputValue.trim() === "") return

    // Add user message
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isUser: true,
      timestamp: Date.now(),
    }

    setMessages([...messages, userMessage])
    const currentInput = inputValue
    setInputValue("")
    
    // Show typing indicator
    setIsTyping(true)

    // Call backend API to get response from Ollama
    fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: currentInput,
        documentId: currentPaper?.documentId, // Use the documentId from upload response
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        setIsTyping(false)
        const botMessage = {
          id: Date.now(),
          text: data.message || "Sorry, I couldn't generate a response.",
          isUser: false,
          timestamp: Date.now(),
        }
        setMessages((prevMessages) => [...prevMessages, botMessage])
      })
      .catch((error) => {
        console.error("Error getting response:", error)
        setIsTyping(false)
        const errorMessage = {
          id: Date.now(),
          text: "Sorry, there was an error getting a response. Please try again.",
          isUser: false,
          timestamp: Date.now(),
        }
        setMessages((prevMessages) => [...prevMessages, errorMessage])
      })
  }

  // Handle key press (Enter to send)
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Start a new chat
  const startNewChat = () => {
    setShowUpload(true)
    setMessages([])
    setCurrentPaper(null)

    // Update active chat
    setActiveChatId(1)
  }

  // Toggle sidebar
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Exit to Landing Page
  const handleExit = () => {
    navigate("/") // Navigate back to the Landing Page
  }

  return createElement(
    "div",
    { className: "chat-interface" },

    // Sidebar
    createElement(
      "div",
      { className: `sidebar ${sidebarOpen ? "open" : "closed"}` },
      createElement(
        "div",
        { className: "sidebar-header" },
        createElement("div", { className: "logo" }, "CiteRight"),
        createElement("button", { className: "new-chat-button", onClick: startNewChat }, "+ New Chat"),
        createElement("button", { className: "exit-button", onClick: handleExit }, "Exit"),
      ),
      createElement(
        "div",
        { className: "chat-summaries" },
        chatSummaries.map((chat) =>
          createElement(ChatSummaryItem, {
            key: chat.id,
            title: chat.title,
            active: chat.id === activeChatId,
            onClick: () => {
              if (chat.id === 1) {
                startNewChat()
              } else {
                setActiveChatId(chat.id)
              }
            },
          }),
        ),
      ),
      createElement(
        "div",
        { className: "user-profile" },
        createElement("div", { className: "user-avatar" }, "👤"),
        createElement("div", { className: "user-name" }, "Researcher"),
      ),
    ),

    // Main Chat Area
    createElement(
      "div",
      { className: "chat-main" },
      createElement(
        "div",
        { className: "chat-header" },
        createElement("button", { className: "toggle-sidebar", onClick: toggleSidebar }, "☰"),
        createElement("div", { className: "chat-title" }, currentPaper ? currentPaper.name : "New Chat"),
      ),

      // Show either upload screen or chat messages
      showUpload
        ? createElement(UploadScreen, { onFileUpload: handleFileUpload })
        : createElement(
            "div",
            { className: "chat-messages" },
            messages.map((message) =>
              createElement(Message, {
                key: message.id,
                message: message,
                isUser: message.isUser,
              }),
            ),
            isTyping && createElement(TypingIndicator, { key: "typing" }),
            createElement("div", { ref: messagesEndRef }),
          ),

      // Input area (only show when not in upload screen)
      !showUpload &&
        createElement(
          "div",
          { className: "chat-input-container" },
          createElement("textarea", {
            className: "chat-input",
            value: inputValue,
            onChange: (e) => setInputValue(e.target.value),
            onKeyPress: handleKeyPress,
            placeholder: "Ask about the research paper...",
          }),
          createElement(
            "button",
            {
              className: "send-button",
              onClick: handleSendMessage,
              disabled: inputValue.trim() === "",
            },
            "→",
          ),
        ),
    ),
  )
}

export default ChatInterface
