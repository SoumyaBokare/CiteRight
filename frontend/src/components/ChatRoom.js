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
          // Call the callback with the uploaded file data (e.g., paper details)
          onFileUpload(file);
        } else {
          console.error("File upload failed", data.error);
        }
      })
      .catch((error) => {
        console.error("Error uploading file", error);
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
    setInputValue("")

    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponses = [
        "Based on the paper, the main finding is that neural networks can effectively predict climate patterns with 87% accuracy when trained on historical data.",
        "The methodology section describes a mixed-methods approach combining quantitative surveys with qualitative interviews from 150 participants.",
        "The authors conclude that further research is needed, but their initial results suggest a strong correlation between the variables.",
        "According to the literature review, three previous studies found similar results, though this paper uses a larger sample size.",
        "The limitations mentioned include potential sampling bias and the need for longitudinal studies to confirm the findings.",
      ]

      const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)]

      const botMessage = {
        id: Date.now(),
        text: randomResponse,
        isUser: false,
        timestamp: Date.now(),
      }

      setMessages((prevMessages) => [...prevMessages, botMessage])
    }, 1000)
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
