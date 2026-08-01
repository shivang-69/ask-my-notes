"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FileText,
  FileCode,
  File,
  Plus,
  Paperclip,
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen
} from "lucide-react";

// Lazy-load the particle canvas background
const ParticleCanvas = dynamic(() => import("../components/ParticleCanvas"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-black -z-10" />
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Source {
  filename: string;
  chunk_index: number;
  text: string;
  distance: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: string;
}

interface DocFile {
  filename: string;
  size_bytes: number;
  ext: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Upload and Sidebar States
  const [files, setFiles] = useState<DocFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Particle Canvas Animations
  const [isSearching, setIsSearching] = useState(false);
  const [isRetrieving, setIsRetrieving] = useState(false);

  // Streaming assistant message state
  const [streamingText, setStreamingText] = useState("");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Sidebar Collapsed State (persisted in localStorage)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    if (saved !== null) {
      setSidebarCollapsed(saved === "true");
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar_collapsed", String(next));
      return next;
    });
  };

  // Reset chat messages for a fresh conversation session
  const handleNewChat = () => {
    setMessages([]);
    setInputQuery("");
    setError(null);
    setStreamingText("");
    setStreamingMessageId(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat automatically
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Fetch document list on component mount
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  // Handle File Upload to /api/upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading & indexing '${file.filename || file.name}'...`);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Upload failed.");
      }

      const data = await response.json();
      setUploadStatus(`Indexed ${data.filename} (${data.indexing_summary?.total_chunks || 0} chunks)`);
      setTimeout(() => setUploadStatus(null), 4000);
      
      // Refresh documents list
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "File upload failed.");
      setUploadStatus(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Submit Query to /api/ask
  const handleSubmitQuery = async (queryToSubmit?: string) => {
    const query = (queryToSubmit || inputQuery).trim();
    if (!query || loading) return;

    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);
    setError(null);

    // Particle animations
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 800);
    setIsRetrieving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, k: 3 }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "API failed to generate answer.");
      }

      const data = await response.json();
      setIsRetrieving(false);

      // Create Assistant Message ID
      const assistantMsgId = (Date.now() + 1).toString();
      setStreamingMessageId(assistantMsgId);
      
      // Simulate Streaming Words
      const fullAnswer = data.answer;
      const words = fullAnswer.split(" ");
      let currentWordIdx = 0;
      let accumulatedText = "";

      const interval = setInterval(() => {
        if (currentWordIdx < words.length) {
          accumulatedText += (currentWordIdx === 0 ? "" : " ") + words[currentWordIdx];
          setStreamingText(accumulatedText);
          currentWordIdx++;
        } else {
          clearInterval(interval);
          
          // Commit finalized message to chat thread
          const finalizedMessage: Message = {
            id: assistantMsgId,
            role: "assistant",
            content: fullAnswer,
            sources: data.sources,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          };

          setMessages((prev) => [...prev, finalizedMessage]);
          setStreamingText("");
          setStreamingMessageId(null);
          setLoading(false);
        }
      }, 35);

    } catch (err: any) {
      setIsRetrieving(false);
      setError(err.message || "Failed to fetch response from backend.");
      setLoading(false);
    }
  };

  const getFileIcon = (ext: string) => {
    switch (ext) {
      case ".pdf":
        return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
      case ".md":
        return <FileCode className="w-4 h-4 text-purple-400 shrink-0" />;
      default:
        return <File className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="relative h-screen w-screen flex bg-black text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Background Gradient & Particle Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(9,9,11,0.9)_0%,rgba(0,0,0,1)_100%)] -z-30 pointer-events-none" />
      <ParticleCanvas isSearching={isSearching} isRetrieving={isRetrieving} />

      {/* Hidden File Input Trigger */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        accept=".txt,.pdf,.md"
        className="hidden"
      />

      {/* ==================================================================== */}
      {/* LEFT SIDEBAR - UPLOADS & DOCUMENTS                                    */}
      {/* ==================================================================== */}
      {/* ==================================================================== */}
      {/* LEFT SIDEBAR - UPLOADS & DOCUMENTS                                    */}
      {/* ==================================================================== */}
      <aside
        className={`h-full bg-zinc-950/80 border-r border-zinc-900 flex flex-col justify-between backdrop-blur-xl shrink-0 z-20 transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? "w-0 opacity-0 overflow-hidden border-r-0 pointer-events-none" : "w-72 opacity-100"
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden w-72">
          {/* Sidebar Header / Brand */}
          <div className="p-4 border-b border-zinc-900/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-widest text-zinc-200 uppercase font-mono">
                ask-my-notes
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase">v1.0</span>
          </div>

          {/* Action Buttons: New Chat & Upload */}
          <div className="p-4 space-y-2.5">
            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800/90 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-800/80 hover:border-zinc-700/80 shadow-sm transition-all duration-200 group"
            >
              <SquarePen className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
              <span>New chat</span>
            </button>

            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-medium border border-indigo-400/30 shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-200 disabled:opacity-50 group"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              )}
              <span>{uploading ? "Indexing Notes..." : "Upload Document"}</span>
            </button>

            {uploadStatus && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2.5 p-2 rounded-lg bg-indigo-950/40 border border-indigo-800/40 text-[11px] text-indigo-300 font-mono flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3 animate-spin shrink-0 text-indigo-400" />
                <span className="truncate">{uploadStatus}</span>
              </motion.div>
            )}
          </div>

          {/* Document List Header */}
          <div className="px-4 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-t border-zinc-900/40">
            <div className="flex items-center gap-1.5">
              <FolderOpen className="w-3 h-3 text-zinc-400" />
              <span>Notes Directory</span>
            </div>
            <span className="bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">{files.length}</span>
          </div>

          {/* Scrollable File Items */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {files.length === 0 ? (
              <div className="text-center py-8 px-4 text-xs text-zinc-600 font-light">
                No documents uploaded yet. Click upload to add PDF, TXT, or MD files.
              </div>
            ) : (
              files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-transparent hover:border-zinc-800/60 hover:bg-zinc-900/40 text-xs text-zinc-300 transition-colors group cursor-default"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {getFileIcon(file.ext)}
                    <span className="truncate text-zinc-300 group-hover:text-white transition-colors">
                      {file.filename}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0 ml-2">
                    {formatBytes(file.size_bytes)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Footer Status */}
        <div className="p-3 border-t border-zinc-900/80 bg-zinc-950/60 text-[10px] font-mono text-zinc-500 flex items-center justify-between w-72">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>FAISS INDEX ONLINE</span>
          </div>
          <span>LOCAL RAG</span>
        </div>
      </aside>

      {/* ==================================================================== */}
      {/* MAIN CHAT VIEW                                                       */}
      {/* ==================================================================== */}
      <main className="flex-1 h-full flex flex-col justify-between relative overflow-hidden bg-black/40">
        {/* Chat Top Header */}
        <header className="px-6 py-4 border-b border-zinc-900/60 bg-zinc-950/40 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={toggleSidebar}
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent hover:border-zinc-800/60 transition-all duration-200 focus:outline-none"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-zinc-400 hover:text-white transition-colors" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-zinc-500 hover:text-zinc-200 transition-colors" />
              )}
            </button>
            
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-semibold tracking-wider text-zinc-200 uppercase font-mono">
                Grounding LLM Session
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-[10px] font-mono text-zinc-400">
              Model: Llama-3.3-70b-versatile
            </span>
          </div>
        </header>

        {/* Scrollable Chat Thread */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Welcome Screen (If no messages yet) */}
          {messages.length === 0 && !streamingText && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto my-12 text-center space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/60 text-[11px] font-mono text-indigo-300">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                SECURE PRIVATE RETRIEVAL
              </div>
              <h1 className="text-3xl sm:text-4xl font-light tracking-tight text-white">
                Ask My Notes
              </h1>
              <p className="text-xs sm:text-sm font-light text-zinc-400 leading-relaxed max-w-lg mx-auto">
                Ask any question across your notes and documents. Grounded responses with source citations — no OCR support yet for scanned files.
              </p>
            </motion.div>
          )}

          {/* Render Chat Messages */}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 max-w-3xl ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-800 border border-zinc-700 text-indigo-400"
                }`}
              >
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Container */}
              <div
                className={`space-y-3 ${
                  msg.role === "user"
                    ? "bg-zinc-900 border border-zinc-800/90 rounded-2xl px-4 py-3 text-sm text-zinc-100 shadow-md"
                    : "space-y-3 w-full"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-4">
                    <p className="text-sm font-light text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </motion.div>
          ))}

          {/* Active Streaming Message */}
          {streamingMessageId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-3xl mr-auto"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 text-indigo-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-4 space-y-2 w-full">
                <p className="text-sm font-light text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1.5 h-3.5 bg-indigo-500 ml-1 animate-pulse" />
                </p>
              </div>
            </motion.div>
          )}

          {/* Global Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl border border-red-900/40 bg-red-950/20 text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ==================================================================== */}
        {/* FIXED BOTTOM INPUT BAR                                               */}
        {/* ==================================================================== */}
        <div className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-10">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitQuery();
              }}
              className="relative flex items-center rounded-2xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl focus-within:border-indigo-500/40 transition-all"
            >
              {/* Attachment Icon */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach Document (.pdf, .txt, .md)"
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask anything about your notes..."
                disabled={loading}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 px-3 focus:outline-none"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || !inputQuery.trim()}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shrink-0 ml-1"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="mt-2 text-center text-[10px] font-mono text-zinc-600">
              Groq Llama 3.3 70B • Grounded RAG with FAISS Vector Storage
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
