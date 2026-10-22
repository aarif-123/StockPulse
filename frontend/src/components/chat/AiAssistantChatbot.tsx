import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { dashboardService } from '../../services/dashboard.service';
import {
  processCopilotQuery,
  executeCopilotAction,
  type CopilotCardData,
  type CopilotActionPayload,
} from '../../utils/copilotEngine';
import {
  IconSend,
  IconX,
  IconMinimize,
  IconTrash,
  IconBarChart,
  IconArrowRight,
  IconCheck,
  IconShield,
  IconAlertTriangle,
  IconClock,
  IconPlus,
  IconCopy,
  IconThumbUp,
  IconThumbDown,
  IconEdit,
} from '../common/Icons';
import { streamIntelligenceChat, type ChatHistoryMessage } from '../../services/intelligence.service';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  cardData?: CopilotCardData;
  action?: CopilotActionPayload;
  suggestedPrompts?: string[];
  isStreaming?: boolean;
  feedback?: 'like' | 'dislike';
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export const AiAssistantChatbot: React.FC = () => {
  const { user, activeOrg, isSuperAdmin, startSupportSession } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // ── Smart Execution Intent: 'action' | 'insight' ──────────────────────────
  type ProcessingIntent = 'action' | 'insight';
  const [executingType, setExecutingType] = useState<'idle' | ProcessingIntent>('idle');

  // Ref for aborting an in-flight intelligence stream when user sends a new message
  const intelligenceAbortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleLoadPromptForEdit = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = promptText.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }, 50);
  };

  /**
   * Smart Intent Classifier
   * Dynamically analyzes prompt to decide whether it's an operational action or strategic insight.
   */
  const classifyPromptIntent = useCallback((rawQuery: string): ProcessingIntent => {
    const clean = rawQuery.trim().toLowerCase();

    // 1. Explicit user/UI prefixes
    if (clean.startsWith('⚡') || clean.startsWith('action:')) return 'action';
    if (clean.startsWith('🧠') || clean.startsWith('insight:') || clean.startsWith('analyse:') || clean.startsWith('analyze:')) return 'insight';

    // 2. Analytical & Strategic Insight cues (dead stock, holding costs, diagnostics, predictions)
    const isAnalyticalQuery = /\b(why|how come|what if|how should|how can|analyse|analyze|analysis|insight|insights|forecast|forecasting|predict|prediction|recommend|recommendation|strategic|strategy|diagnose|diagnosis|root cause|margin drop|margin leak|profitability|churn|dead stock|dead inventory|dormant|idle stock|stagnant|slow moving|holding cost|turnover|velocity|bottleneck|trend|trends|evaluate|discrepancy|reorder.*week|what.*reorder|what.*buy|inventory health)\b/i.test(clean);
    if (isAnalyticalQuery) return 'insight';

    // 3. Question mark inquiries (business/financial questions)
    if (clean.includes('?') && !/\b(how many|list|show)\b/i.test(clean)) return 'insight';

    // 4. Operational mutation action cues (create, inward, outward, adjust, confirm, etc.)
    const isOperationalMutation = /^(create|make|issue|draft|generate|inward|outward|dispatch|add stock|move stock|restock|confirm|approve|reject|cancel|delete|update|build|assemble|discharge)\b/i.test(clean);
    if (isOperationalMutation) return 'action';

    return 'action';
  }, []);


  // Floatable & Draggable Trigger Button State
  const TRIGGER_WIDTH = 56;
  const TRIGGER_HEIGHT = 56;
  const [btnPos, setBtnPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingBtn, setIsDraggingBtn] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    hasMoved: false,
  });

  // Floatable & Draggable Window State
  const [windowPos, setWindowPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const windowDragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    hasMoved: false,
  });

  // Restore or initialize button position
  useEffect(() => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const height = typeof window !== 'undefined' ? window.innerHeight : 800;

    try {
      const saved = localStorage.getItem('stockpulse_copilot_float_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.max(16, Math.min(width - TRIGGER_WIDTH - 16, parsed.x));
          const clampedY = Math.max(16, Math.min(height - TRIGGER_HEIGHT - 16, parsed.y));
          setBtnPos({ x: clampedX, y: clampedY });
          return;
        }
      }
    } catch {
      // ignore
    }

    setBtnPos({
      x: Math.max(16, width - TRIGGER_WIDTH - 24),
      y: Math.max(16, height - TRIGGER_HEIGHT - 24),
    });
  }, []);

  // Handle window resizing to keep coordinates inside viewport boundaries
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setBtnPos((prev) => {
        if (!prev) return prev;
        return {
          x: Math.max(16, Math.min(width - TRIGGER_WIDTH - 16, prev.x)),
          y: Math.max(16, Math.min(height - TRIGGER_HEIGHT - 16, prev.y)),
        };
      });

      setWindowPos((prev) => {
        if (!prev) return prev;
        const winWidth = isExpanded ? 540 : 440;
        const winHeight = isExpanded ? 720 : 620;
        return {
          x: Math.max(16, Math.min(width - winWidth - 16, prev.x)),
          y: Math.max(16, Math.min(height - winHeight - 16, prev.y)),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Pointer drag handlers for Floating Action Button
  const handlePointerDownBtn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const currentX = btnPos?.x ?? Math.max(16, window.innerWidth - TRIGGER_WIDTH - 24);
    const currentY = btnPos?.y ?? Math.max(16, window.innerHeight - TRIGGER_HEIGHT - 24);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      hasMoved: false,
    };
    setIsDraggingBtn(true);
  };

  const handlePointerMoveBtn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingBtn) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragStartRef.current.hasMoved = true;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const newX = Math.max(16, Math.min(width - TRIGGER_WIDTH - 16, dragStartRef.current.initX + deltaX));
    const newY = Math.max(16, Math.min(height - TRIGGER_HEIGHT - 16, dragStartRef.current.initY + deltaY));

    setBtnPos({ x: newX, y: newY });
  };

  const handlePointerUpBtn = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingBtn) return;
    setIsDraggingBtn(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (dragStartRef.current.hasMoved) {
      if (btnPos) {
        localStorage.setItem('stockpulse_copilot_float_pos', JSON.stringify(btnPos));
      }
    } else {
      setIsOpen(true);
    }
  };

  const handleResetButtonPos = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultPos = {
      x: Math.max(16, window.innerWidth - TRIGGER_WIDTH - 24),
      y: Math.max(16, window.innerHeight - TRIGGER_HEIGHT - 24),
    };
    setBtnPos(defaultPos);
    localStorage.setItem('stockpulse_copilot_float_pos', JSON.stringify(defaultPos));
  };

  // Pointer drag handlers for Floating Chatbot Window Header
  const handlePointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.button !== 0) return;

    const target = e.currentTarget;
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const winWidth = isExpanded ? 540 : 440;
    const winHeight = isExpanded ? 720 : 620;
    const currentX = windowPos?.x ?? Math.max(16, window.innerWidth - winWidth - 24);
    const currentY = windowPos?.y ?? Math.max(16, window.innerHeight - winHeight - 24);

    windowDragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
      hasMoved: false,
    };
    setIsDraggingWindow(true);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindow) return;
    const deltaX = e.clientX - windowDragStartRef.current.startX;
    const deltaY = e.clientY - windowDragStartRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      windowDragStartRef.current.hasMoved = true;
    }

    const winWidth = isExpanded ? 540 : 440;
    const winHeight = isExpanded ? 720 : 620;
    const width = window.innerWidth;
    const height = window.innerHeight;

    const newX = Math.max(16, Math.min(width - winWidth - 16, windowDragStartRef.current.initX + deltaX));
    const newY = Math.max(16, Math.min(height - winHeight - 16, windowDragStartRef.current.initY + deltaY));

    setWindowPos({ x: newX, y: newY });
  };

  const handlePointerUpHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingWindow) return;
    setIsDraggingWindow(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const [liveStats, setLiveStats] = useState<{ lowStockCount?: number; draftChallans?: number; totalProducts?: number } | null>(null);

  useEffect(() => {
    if (isOpen && !isSuperAdmin) {
      dashboardService.getStats()
        .then((res: any) => {
          if (res) {
            setLiveStats({
              lowStockCount: res.inventory?.lowStockCount || 0,
              draftChallans: res.challans?.totalDraft || 0,
              totalProducts: res.inventory?.totalProducts || 0,
            });
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [isOpen, isSuperAdmin]);

  const getWelcomeConfig = () => {
    const role = activeOrg?.role || user?.role || 'SALES';
    const name = user?.name?.split(' ')[0] || 'there';
    const alerts: string[] = [];
    if (liveStats?.lowStockCount) alerts.push(`${liveStats.lowStockCount} low stock`);
    if (liveStats?.draftChallans) alerts.push(`${liveStats.draftChallans} draft challans`);
    const alertLine = alerts.length ? `\n⚠️ ${alerts.join(' · ')}` : '';

    if (isSuperAdmin) {
      return {
        text: `Hey ${name} 👑${alertLine}`,
        prompts: [
          '⚡ Show platform overview metrics',
          '⚡ List tenant organizations',
          '🧠 Analyse multi-tenant resource growth',
          '🧠 Inspect error & latency anomalies',
        ],
      };
    }

    const rolePrompts: Record<string, string[]> = {
      SALES: [
        '⚡ Create a new challan',
        '⚡ Show active customers',
        '🧠 Analyse customer buying velocity',
        '🧠 Which accounts are at churn risk?',
      ],
      WAREHOUSE: [
        '⚡ Inward 50 stock for product',
        '⚡ tell me the pending chalana',
        '🧠 Identify slow-moving & dead stock',
        '🧠 Forecast component shortage risks',
      ],
      ACCOUNTS: [
        '⚡ Audit uninvoiced challans',
        '⚡ Recent stock movements',
        '🧠 What is our total inventory valuation?',
        '🧠 Analyse gross margin & pricing leakage',
      ],
      ORG_ADMIN: [
        '⚡ Create a new challan',
        '⚡ Inward 50 stock for product',
        '🧠 Analyse inventory holding costs & dead capital',
        '🧠 Forecast reorder priorities & safety stock',
      ],
      ADMIN: [
        '⚡ Create a new challan',
        '⚡ Inward 50 stock for product',
        '🧠 Analyse inventory holding costs & dead capital',
        '🧠 Forecast reorder priorities & safety stock',
      ],
    };

    return {
      text: `Hey ${name} 👋${alertLine}`,
      prompts: rolePrompts[role] ?? rolePrompts.ORG_ADMIN,
    };
  };

  // Strict user-level session isolation: each user within an organization has their own private chat store
  const userIdentifier = user?.id || user?.email || 'guest';
  const orgIdentifier = activeOrg?.organizationId || 'default';
  const storageKey = `stockpulse_chat_sessions_${orgIdentifier}_${userIdentifier}`;

  const createFreshMessage = useCallback((): ChatMessage => {
    const config = getWelcomeConfig();
    return {
      id: `welcome-${Date.now()}`,
      sender: 'ai',
      text: config.text.replace(/\uFFFD/g, '').trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedPrompts: config.prompts.map((p) => p.replace(/\uFFFD/g, '').trim()),
    };
  }, [user, activeOrg, isSuperAdmin, liveStats]);

  const createFreshSession = useCallback((): ChatSession => {
    const msg = createFreshMessage();
    return {
      id: `sess-${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [msg],
    };
  }, [createFreshMessage]);

  // Load existing user sessions or seed a fresh one
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      // Clean up any legacy shared org-wide key to prevent cross-user leakage
      localStorage.removeItem(`stockpulse_chat_sessions_${orgIdentifier}`);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [createFreshSession()];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    return sessions[0]?.id || `sess-${Date.now()}`;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return sessions[0]?.messages?.length ? sessions[0].messages : [createFreshMessage()];
  });

  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  // Re-sync chat sessions whenever the authenticated user or active organization changes
  useEffect(() => {
    try {
      localStorage.removeItem(`stockpulse_chat_sessions_${orgIdentifier}`);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setMessages(parsed[0].messages);
          return;
        }
      }
    } catch {
      // ignore
    }
    const fresh = createFreshSession();
    setSessions([fresh]);
    setCurrentSessionId(fresh.id);
    setMessages(fresh.messages);
  }, [storageKey, orgIdentifier, createFreshSession]);

  // Persist session messages whenever messages change
  useEffect(() => {
    setSessions((prevSessions) => {
      const idx = prevSessions.findIndex((s) => s.id === currentSessionId);
      const firstUserMsg = messages.find((m) => m.sender === 'user');
      const autoTitle = firstUserMsg ? firstUserMsg.text.slice(0, 42) : 'New Conversation';

      let next: ChatSession[];
      if (idx === -1) {
        const newSess: ChatSession = {
          id: currentSessionId,
          title: autoTitle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages,
        };
        next = [newSess, ...prevSessions];
      } else {
        const current = prevSessions[idx];
        const updatedTitle = current.title === 'New Conversation' && firstUserMsg ? autoTitle : current.title;
        const updatedSess: ChatSession = {
          ...current,
          title: updatedTitle,
          updatedAt: Date.now(),
          messages,
        };
        next = [...prevSessions];
        next[idx] = updatedSess;
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 30)));
      } catch {
        // ignore
      }
      return next;
    });
  }, [messages, currentSessionId, storageKey]);

  // Compute measurable metrics for chat tracking
  const chatMetrics = React.useMemo(() => {
    let totalQueries = 0;
    let actionsExecuted = 0;
    let likes = 0;
    let dislikes = 0;

    sessions.forEach((s) => {
      s.messages.forEach((m: ChatMessage) => {
        if (m.sender === 'user') totalQueries++;
        if (m.action?.status === 'COMPLETED') actionsExecuted++;
        if (m.feedback === 'like') likes++;
        if (m.feedback === 'dislike') dislikes++;
      });
    });

    const totalFeedback = likes + dislikes;
    const helpfulRate = totalFeedback > 0 ? Math.round((likes / totalFeedback) * 100) : 100;

    return {
      totalSessions: sessions.length,
      totalQueries,
      actionsExecuted,
      likes,
      dislikes,
      helpfulRate,
    };
  }, [sessions]);

  const handleNewChat = () => {
    const newSess = createFreshSession();
    setSessions((prev) => {
      const updated = [newSess, ...prev];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated.slice(0, 30)));
      } catch {
        // ignore
      }
      return updated;
    });
    setCurrentSessionId(newSess.id);
    setMessages(newSess.messages);
    setShowHistoryDrawer(false);
  };

  const handleSwitchSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (!target) return;
    setCurrentSessionId(target.id);
    setMessages(target.messages);
    setShowHistoryDrawer(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      const finalSessions = filtered.length > 0 ? filtered : [createFreshSession()];
      try {
        localStorage.setItem(storageKey, JSON.stringify(finalSessions.slice(0, 30)));
      } catch {
        // ignore
      }
      if (sessionId === currentSessionId) {
        const nextActive = finalSessions[0];
        setCurrentSessionId(nextActive.id);
        setMessages(nextActive.messages);
      }
      return finalSessions;
    });
  };

  const handleClearAllHistory = () => {
    const fresh = [createFreshSession()];
    try {
      localStorage.setItem(storageKey, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    setSessions(fresh);
    setCurrentSessionId(fresh[0].id);
    setMessages(fresh[0].messages);
    setShowHistoryDrawer(false);
  };

  const handleCopyResponse = async (msgId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => {
        setCopiedMsgId((curr) => (curr === msgId ? null : curr));
      }, 2000);
    } catch {
      // ignore
    }
  };

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const next = m.feedback === type ? undefined : type;
          return { ...m, feedback: next };
        }
        return m;
      })
    );
  };

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(historySearch.toLowerCase())
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = async (customPrompt?: string) => {
    const query = (customPrompt || input).trim();
    if (!query || isTyping) return;

    // Clean any leading emoji from chip click
    const cleanQuery = query.replace(/^[⚡🧠]\s*/, '');

    // Abort any prior intelligence stream before starting a new send
    intelligenceAbortRef.current?.abort();
    intelligenceAbortRef.current = null;

    // Smart prompt intent analysis
    const intent = classifyPromptIntent(query);
    setExecutingType(intent);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: cleanQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsTyping(true);

    // ── 1. STRATEGIC / REASONING INSIGHT (Intelligence LLM) ───────────────────
    if (intent === 'insight') {
      const history: ChatHistoryMessage[] = messages
        .filter((m) => m.sender === 'user' || (m.sender === 'ai' && !m.action && !m.cardData))
        .slice(-10)
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

      const streamMsgId = `ai-intel-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: streamMsgId,
          sender: 'ai',
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isStreaming: true,
        },
      ]);

      intelligenceAbortRef.current = streamIntelligenceChat(
        cleanQuery,
        history,
        {
          onToken: (token: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId ? { ...m, text: m.text + token } : m
              )
            );
          },
          onDone: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId
                  ? {
                      ...m,
                      isStreaming: false,
                      suggestedPrompts: [
                        '⚡ Show low stock products',
                        '⚡ Inward 50 stock for product',
                        '🧠 What should I reorder this week?',
                        '🧠 Analyse inventory health',
                      ],
                    }
                  : m
              )
            );
            setIsTyping(false);
            setExecutingType('idle');
            intelligenceAbortRef.current = null;
          },
          onError: (message: string) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamMsgId
                  ? {
                      ...m,
                      text: `⚠️ ${message}`,
                      isStreaming: false,
                      suggestedPrompts: [
                        '⚡ Show workspace stats & KPIs',
                        '🧠 What should I reorder this week?',
                      ],
                    }
                  : m
              )
            );
            setIsTyping(false);
            setExecutingType('idle');
            intelligenceAbortRef.current = null;
          },
        },
      );
      return;
    }

    // ── 2. OPERATIONAL ACTION (Copilot Engine with Auto-Escalation) ────────────
    try {
      const response = await processCopilotQuery(cleanQuery, { user, activeOrg, isSuperAdmin });

      // If copilot hit generic unhandled fallback, auto-escalate to intelligence LLM
      const isGenericFallback = response.text.includes('key modules and actions you can explore');
      if (isGenericFallback && !isSuperAdmin) {
        setExecutingType('insight');
        const history: ChatHistoryMessage[] = messages
          .filter((m) => m.sender === 'user' || (m.sender === 'ai' && !m.action && !m.cardData))
          .slice(-10)
          .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

        const streamMsgId = `ai-intel-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: streamMsgId,
            sender: 'ai',
            text: '',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isStreaming: true,
          },
        ]);

        intelligenceAbortRef.current = streamIntelligenceChat(
          cleanQuery,
          history,
          {
            onToken: (token: string) => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId ? { ...m, text: m.text + token } : m
                )
              );
            },
            onDone: () => {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                        ...m,
                        isStreaming: false,
                        suggestedPrompts: [
                          '⚡ Create a new challan',
                          '⚡ Inward 50 stock for product',
                          '🧠 Analyse inventory health',
                        ],
                      }
                    : m
                )
              );
              setIsTyping(false);
              setExecutingType('idle');
              intelligenceAbortRef.current = null;
            },
            onError: () => {
              // Gracefully fall back to deterministic response
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId
                    ? {
                        id: `ai-${Date.now()}`,
                        sender: 'ai',
                        text: response.text,
                        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        suggestedPrompts: response.suggestedPrompts,
                      }
                    : m
                )
              );
              setIsTyping(false);
              setExecutingType('idle');
              intelligenceAbortRef.current = null;
            },
          },
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cardData: response.cardData,
          action: response.action,
          suggestedPrompts: response.suggestedPrompts,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ I encountered an error fetching live data. Please ensure your session is active.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: [
            '⚡ Show workspace stats & KPIs',
            '🧠 What should I reorder this week?',
          ],
        },
      ]);
    } finally {
      setIsTyping(false);
      setExecutingType('idle');
    }
  };

  const handleApproveAction = async (msgId: string, action: CopilotActionPayload) => {
    // Set executing state
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.action
          ? { ...m, action: { ...m.action, status: 'EXECUTING' } }
          : m
      )
    );

    const result = await executeCopilotAction(action);

    if (result.success && action.actionType === 'START_SUPPORT_SESSION' && result.data) {
      const { session, impersonationToken, targetUser, targetOrganization } = result.data;
      const targetOrgSummary = {
        organizationId: targetOrganization.id,
        organizationName: targetOrganization.name,
        organizationSlug: targetOrganization.slug,
        role: 'ORG_ADMIN' as const,
        status: 'ACTIVE',
      };
      const targetUserObj = {
        ...targetUser,
        isSuperAdmin: false,
        role: 'ORG_ADMIN' as const,
      };
      startSupportSession(impersonationToken, session.id, targetUserObj, targetOrgSummary);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    }

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.action) {
          if (result.success) {
            return {
              ...m,
              action: {
                ...m.action,
                status: 'COMPLETED',
                executionResult: result.data,
              },
            };
          } else {
            return {
              ...m,
              action: {
                ...m.action,
                status: 'FAILED',
                errorMessage: result.message,
              },
            };
          }
        }
        return m;
      })
    );
  };

  const handleRejectAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.action
          ? { ...m, action: { ...m.action, status: 'REJECTED' } }
          : m
      )
    );
  };

  // Helper to update action params in-place (e.g. quantity stepper, product switch)
  const handleUpdateActionParams = (
    msgId: string,
    updater: (prevAction: CopilotActionPayload) => CopilotActionPayload
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.action && m.action.status === 'PENDING') {
          return {
            ...m,
            action: updater(m.action),
          };
        }
        return m;
      })
    );
  };

  const handleClearChat = () => {
    setMessages([createFreshMessage()]);
  };

  const getQuickPrompts = () => {
    if (isSuperAdmin) {
      return [
        { label: '📊 Overview Metrics', prompt: 'Show platform overview metrics' },
        { label: '🩺 System Health', prompt: 'Show system health telemetry' },
        { label: '🏢 Tenant Orgs', prompt: 'List tenant organizations' },
        { label: '💳 UPI Payments', prompt: 'Show pending payments' },
        { label: '📜 Global Audits', prompt: 'Show global audit logs' },
      ];
    }

    const role = activeOrg?.role || user?.role || 'SALES';
    if (role === 'SALES') {
      return [
        { label: '⚡ Create Challan', prompt: 'Create delivery challan' },
        { label: '🚚 Pending Challans', prompt: 'tell me the pending chalana' },
        { label: '👥 CRM Customers', prompt: 'Show active customers' },
        { label: '🎯 Lead Records', prompt: 'Show customer leads' },
      ];
    }
    if (role === 'WAREHOUSE') {
      return [
        { label: '📥 Inward Stock', prompt: 'Inward 20 stock for product' },
        { label: '🛠️ BOM Assemblies', prompt: 'Tell me about the bill of materials' },
        { label: '🚚 Pending Challans', prompt: 'tell me the pending chalana' },
        { label: '📦 Low Stock Alert', prompt: 'Show low stock products' },
      ];
    }
    if (role === 'ACCOUNTS') {
      return [
        { label: '💰 Asset Valuation', prompt: 'What is our total inventory valuation?' },
        { label: '📋 Stock Flow Audit', prompt: 'Recent stock movements' },
        { label: '📊 Workspace Stats', prompt: 'Show workspace stats & KPIs' },
      ];
    }

    return [
      { label: '🛠️ BOM Assemblies', prompt: 'Tell me about the bill of materials' },
      { label: '🚚 Pending Challans', prompt: 'tell me the pending chalana' },
      { label: '⚡ Create Challan', prompt: 'Create delivery challan' },
      { label: '📦 Low Stock Alert', prompt: 'Show low stock products' },
      { label: '📥 Inward Stock', prompt: 'Inward 20 stock for product' },
      { label: '💰 Valuation', prompt: 'What is our total inventory valuation?' },
      { label: '📊 Workspace Stats', prompt: 'Show workspace stats & KPIs' },
    ];
  };

  const topQuickPrompts = getQuickPrompts();

  // High-Quality Clean UI Markdown & Structured Executive Component Renderer
  const renderFormattedText = (text: string) => {
    const formatInline = (str: string) => {
      if (!str) return null;
      // Normalize escaped characters and markdown artifacts
      let cleanStr = str.replace(/\\([*_`])/g, '$1');

      // Strip empty trailing formatting marks (e.g. "**" at the end of a truncated stream)
      cleanStr = cleanStr.replace(/\*\*\s*$/, (m) => ((cleanStr.match(/\*\*/g) || []).length % 2 === 1 ? '' : m));
      cleanStr = cleanStr.replace(/(?<!\*)\*\s*$/, (m) => ((cleanStr.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 === 1 ? '' : m));

      // Auto-close unmatched bold or italic markers so formatting stays intact
      if ((cleanStr.match(/\*\*/g) || []).length % 2 === 1) {
        cleanStr = cleanStr + '**';
      }
      if ((cleanStr.match(/(?<!\*)\*(?!\*)/g) || []).length % 2 === 1) {
        cleanStr = cleanStr + '*';
      }

      const parts = cleanStr.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`)/g);
      return parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          return (
            <strong key={pIdx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
          return (
            <code
              key={pIdx}
              style={{
                fontSize: '11.5px',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#38bdf8',
                padding: '1px 5px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
          const inner = part.slice(1, -1).replace(/^["']|["']$/g, '');
          return (
            <em
              key={pIdx}
              style={{
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
              }}
            >
              {inner}
            </em>
          );
        }
        return part;
      });
    };

    // Helper to sanitize badges from markdown asterisks and excess symbols
    const sanitizeBadge = (val: string): string => {
      return val.replace(/\*\*/g, '').replace(/^\*|\*$/g, '').trim();
    };

    // Helper to extract executive KPI metrics from verdict text
    const extractExecutiveMetrics = (lines: string[]): Array<{ label: string; value: string; trend: 'danger' | 'warning' | 'info' | 'success' }> => {
      const fullText = lines.join(' ');
      const metrics: Array<{ label: string; value: string; trend: 'danger' | 'warning' | 'info' | 'success' }> = [];

      const deadMatch = fullText.match(/(?:dead stock|dormant)[^₹]*?(₹[\d.]+\s*(?:Cr|L|K|crore|lakh)?)/i);
      if (deadMatch) {
        metrics.push({ label: 'Dead Capital', value: deadMatch[1].trim(), trend: 'danger' });
      }

      const overstockMatch = fullText.match(/(?:excess|overstock)[^₹]*?(₹[\d.]+\s*(?:Cr|L|K|crore|lakh)?)/i);
      if (overstockMatch) {
        metrics.push({ label: 'Excess Overstock', value: overstockMatch[1].trim(), trend: 'warning' });
      }

      const pctMatch = fullText.match(/([\d.]+%)\s*(?:of total cost valuation|valuation)/i);
      if (pctMatch) {
        metrics.push({ label: 'Valuation Drag', value: pctMatch[1].trim(), trend: 'danger' });
      }

      const marginMatch = fullText.match(/([\d.]+%)\s*gross margin/i);
      if (marginMatch) {
        metrics.push({ label: 'Gross Margin', value: marginMatch[1].trim(), trend: 'info' });
      }

      // Fallback: extract generic figures if specific regex didn't catch at least 2 metrics
      if (metrics.length < 2) {
        const rupeeMatches = Array.from(fullText.matchAll(/₹[\d.]+\s*(?:Cr|L|K|crore|lakh)?/gi)).map((m) => m[0]);
        const pctMatches = Array.from(fullText.matchAll(/[\d.]+%/g)).map((m) => m[0]);

        if (rupeeMatches[0] && !metrics.some((m) => m.value === rupeeMatches[0])) {
          metrics.push({ label: 'Exposure', value: rupeeMatches[0], trend: 'danger' });
        }
        if (rupeeMatches[1] && !metrics.some((m) => m.value === rupeeMatches[1])) {
          metrics.push({ label: 'Secondary Impact', value: rupeeMatches[1], trend: 'warning' });
        }
        if (pctMatches[0] && !metrics.some((m) => m.value === pctMatches[0])) {
          metrics.push({ label: 'Portfolio Share', value: pctMatches[0], trend: 'info' });
        }
      }

      return metrics.slice(0, 4);
    };

    // Helper to render table cells with intelligent badging and SKU deep-linking
    const renderTableCell = (cell: string) => {
      const trimmed = cell.trim();
      const sanitized = sanitizeBadge(trimmed);
      const lower = sanitized.toLowerCase();

      // Check for SKU pattern (e.g. SKU-00005, E2E-PROD, DEL-U2723-4K)
      const isSku = /^(?:SKU-\w+|E2E-[A-Z0-9-]+|[A-Z]{2,4}-[A-Z0-9-]+)$/i.test(sanitized);
      if (isSku) {
        return (
          <button
            type="button"
            onClick={() => navigate(`/products?search=${encodeURIComponent(sanitized)}`)}
            title={`View SKU "${sanitized}" in catalog`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#c084fc',
              backgroundColor: 'rgba(124, 58, 237, 0.12)',
              border: '1px solid rgba(124, 58, 237, 0.28)',
              padding: '1px 6px',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.28)';
            }}
          >
            <span>📋</span>
            <span>{sanitized}</span>
          </button>
        );
      }

      // Check for critical / negative / risk status badges
      if (
        lower.includes('critical') ||
        lower.includes('zero movement') ||
        lower.includes('dead') ||
        lower.includes('freeze') ||
        lower.includes('risk') ||
        lower.includes('deficit') ||
        lower.includes('bottleneck') ||
        lower.includes('stagnant')
      ) {
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(239, 68, 68, 0.14)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            {sanitized}
          </span>
        );
      }

      // Check for healthy / positive status badges
      if (
        lower.includes('healthy') ||
        lower.includes('normal') ||
        lower.includes('class a') ||
        lower.includes('active') ||
        lower.includes('gain') ||
        lower.includes('safe') ||
        lower.includes('recovered')
      ) {
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.14)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            {sanitized}
          </span>
        );
      }

      // Check for warning / moderate status badges
      if (lower.includes('class b') || lower.includes('moderate') || lower.includes('excess') || lower.includes('warning')) {
        return (
          <span
            style={{
              display: 'inline-block',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(245, 158, 11, 0.14)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            {sanitized}
          </span>
        );
      }

      // Financial value (₹)
      if (sanitized.includes('₹')) {
        return (
          <strong style={{ color: '#38bdf8', fontWeight: 700 }}>
            {sanitized}
          </strong>
        );
      }

      return formatInline(trimmed);
    };

    // Helper to render an Executive-grade Markdown table with shortcuts
    const renderTable = (headers: string[], rows: string[][], key: string | number) => (
      <div
        key={key}
        style={{
          margin: '6px 0 10px 0',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'rgba(0, 0, 0, 0.18)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    style={{
                      padding: '7px 9px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rIdx) => {
                const isTotalRow = row[0] && row[0].toLowerCase().includes('total');
                return (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: rIdx === rows.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.04)',
                      borderTop: isTotalRow ? '2px solid rgba(255, 255, 255, 0.15)' : undefined,
                      backgroundColor: isTotalRow
                        ? 'rgba(255, 255, 255, 0.06)'
                        : rIdx % 2 === 1
                        ? 'rgba(255, 255, 255, 0.015)'
                        : 'transparent',
                      fontWeight: isTotalRow ? 700 : 'normal',
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: '7px 9px',
                          color: isTotalRow ? 'var(--text-primary)' : 'var(--text-primary)',
                          verticalAlign: 'middle',
                          whiteSpace: cIdx === 0 || cIdx === row.length - 1 ? 'nowrap' : 'normal',
                        }}
                      >
                        {renderTableCell(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Quick Navigation Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            fontSize: '10.5px',
          }}
        >
          <span style={{ color: 'var(--text-tertiary)' }}>{rows.length} lines parsed</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => navigate('/products')}
              title="Open full products catalog"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                padding: '2px 7px',
                cursor: 'pointer',
                fontSize: '10.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              📦 Catalog
            </button>
            <button
              type="button"
              onClick={() => navigate('/reorder')}
              title="Open Purchasing & Reorder Hub"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                padding: '2px 7px',
                cursor: 'pointer',
                fontSize: '10.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              🛒 Reorder Hub
            </button>
            <button
              type="button"
              onClick={() => navigate('/reports')}
              title="Open Reports & Analytics"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                padding: '2px 7px',
                cursor: 'pointer',
                fontSize: '10.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              📊 Reports
            </button>
          </div>
        </div>
      </div>
    );

    // Parse raw text into structured sections
    interface SectionBlock {
      heading: string;
      lines: string[];
    }

    const rawLines = text.split('\n');
    const sections: SectionBlock[] = [];
    let currentSection: SectionBlock = { heading: '', lines: [] };

    const isHeadingLine = (line: string): boolean => {
      if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) return true;
      // Matches standalone bold line like **Executive Verdict** or **Key Financial Drivers:**
      return /^\*\*[^*]+?\*\*:?$/.test(line);
    };

    const extractHeadingText = (line: string): string => {
      if (line.startsWith('#')) {
        return line.replace(/^#+\s*/, '').trim();
      }
      return line.replace(/^\*\*|\*\*:?$/g, '').trim();
    };

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      if (isHeadingLine(trimmed)) {
        if (currentSection.lines.length > 0 || currentSection.heading) {
          sections.push(currentSection);
        }
        currentSection = {
          heading: extractHeadingText(trimmed),
          lines: [],
        };
      } else {
        currentSection.lines.push(trimmed);
      }
    }
    if (currentSection.lines.length > 0 || currentSection.heading) {
      sections.push(currentSection);
    }

    // Function to render elements within any section (tables, metrics, actions, prose)
    const renderSectionElements = (lines: string[]) => {
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // 1. Table Detection (supports standard markdown | a | b | and loose a | b | c tables)
        const isTableRowLine = (l: string) => {
          if (!l.includes('|')) return false;
          if (/^[-•*]\s/.test(l) || /^\d+\.\s/.test(l)) return false;
          const pipes = l.split('|');
          return pipes.length >= 3;
        };

        if (isTableRowLine(line)) {
          const tableLines: string[] = [];
          while (i < lines.length && isTableRowLine(lines[i])) {
            tableLines.push(lines[i]);
            i++;
          }

          if (tableLines.length >= 2) {
            const parseRow = (r: string) => {
              let clean = r.trim();
              if (clean.startsWith('|')) clean = clean.slice(1);
              if (clean.endsWith('|')) clean = clean.slice(0, -1);
              return clean.split('|').map((c) => c.trim());
            };

            const headers = parseRow(tableLines[0]);
            const hasDivider = tableLines.length > 1 && /[-:]{2,}\s*\|/.test(tableLines[1]);
            const rows = tableLines.slice(hasDivider ? 2 : 1).map(parseRow);

            elements.push(renderTable(headers, rows, `tbl-${i}`));
            continue;
          }
        }

        // 2. Metric Bullet Detection (- **Label**: Value — Detail)
        const metricMatch = line.match(/^[-•*]\s*\*\*(.+?)\*\*:\s*(.*)$/);
        if (metricMatch) {
          const label = metricMatch[1].trim();
          const rest = metricMatch[2].trim();
          const dashParts = rest.split(/\s*[—–]\s*/);
          let value = '';
          let detail = rest;

          if (dashParts.length > 1) {
            value = sanitizeBadge(dashParts[0]);
            detail = dashParts.slice(1).join(' — ').trim();
          }

          const vLower = (value + ' ' + label).toLowerCase();
          let badgeBg = 'rgba(124, 58, 237, 0.12)';
          let badgeColor = '#c084fc';
          let badgeBorder = 'rgba(124, 58, 237, 0.25)';

          if (
            vLower.includes('dead') ||
            vLower.includes('risk') ||
            vLower.includes('critical') ||
            vLower.includes('drag') ||
            vLower.includes('stagnant') ||
            vLower.includes('deficit') ||
            vLower.includes('loss') ||
            vLower.includes('freeze')
          ) {
            badgeBg = 'rgba(239, 68, 68, 0.14)';
            badgeColor = '#f87171';
            badgeBorder = 'rgba(239, 68, 68, 0.3)';
          } else if (
            vLower.includes('safe') ||
            vLower.includes('healthy') ||
            vLower.includes('gain') ||
            vLower.includes('normal') ||
            vLower.includes('margin') ||
            vLower.includes('profit')
          ) {
            badgeBg = 'rgba(16, 185, 129, 0.14)';
            badgeColor = '#34d399';
            badgeBorder = 'rgba(16, 185, 129, 0.3)';
          } else if (value.includes('₹') || /^\d/.test(value)) {
            badgeBg = 'rgba(56, 189, 248, 0.12)';
            badgeColor = '#38bdf8';
            badgeBorder = 'rgba(56, 189, 248, 0.25)';
          }

          elements.push(
            <div
              key={`metric-${i}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '7px',
                fontSize: '13px',
                lineHeight: '1.55',
                marginBottom: '4px',
              }}
            >
              <span style={{ color: '#a78bfa', fontSize: '13px', lineHeight: '1.4', marginTop: '1px' }}>•</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>{formatInline(label)}: </strong>
                {value && (
                  <span
                    style={{
                      display: 'inline-block',
                      backgroundColor: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '11.5px',
                      marginRight: '6px',
                      verticalAlign: 'baseline',
                    }}
                  >
                    {value}
                  </span>
                )}
                {detail && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {value ? '— ' : ''}{formatInline(detail)}
                  </span>
                )}
              </div>
            </div>
          );
          i++;
          continue;
        }

        // 3. Numbered Action Steps Detection (1. **Action Name**: Detail)
        const actionMatch = line.match(/^(\d+)\.\s*(.*)$/);
        if (actionMatch) {
          const stepNum = actionMatch[1];
          const actionText = actionMatch[2];
          const cleanText = actionText.replace(/[*_]/g, '').trim();
          if (!cleanText) {
            i++;
            continue;
          }

          // Extract executable command prompt if present, or derive productive intent
          let execPrompt = '';
          const explicitActionMatch = actionText.match(/Action:\s*["'*`]?([^"'*`\n]+)["'*`]?/i);
          if (explicitActionMatch) {
            execPrompt = explicitActionMatch[1].trim();
          } else {
            const lowerAct = cleanText.toLowerCase();
            if (lowerAct.includes('dead stock') || lowerAct.includes('liquidat')) {
              execPrompt = 'Show dead stock in inventory';
            } else if (lowerAct.includes('reorder') || lowerAct.includes('low stock') || lowerAct.includes('deficit')) {
              execPrompt = 'Show low stock products';
            } else if (lowerAct.includes('overstock') || lowerAct.includes('valuation') || lowerAct.includes('capital')) {
              execPrompt = 'What is our total inventory valuation?';
            } else if (lowerAct.includes('challan') || lowerAct.includes('dispatch')) {
              execPrompt = 'tell me the pending chalana';
            } else if (lowerAct.includes('inward') || lowerAct.includes('procurement')) {
              execPrompt = 'Recent stock movements';
            }
          }

          // Build targeted direct ERP deep link action shortcuts
          const lowerAct = cleanText.toLowerCase();
          const navActions: Array<{ label: string; path: string; icon: string; title: string }> = [];

          if (lowerAct.includes('dead stock') || lowerAct.includes('liquidat') || lowerAct.includes('clearance')) {
            navActions.push({ label: 'Create Clearance Challan', path: '/challans/new', icon: '🚚', title: 'Open delivery challan creation' });
            navActions.push({ label: 'Filter Catalog', path: '/products', icon: '📦', title: 'Open products inventory' });
          } else if (lowerAct.includes('reorder') || lowerAct.includes('low stock') || lowerAct.includes('procurement') || lowerAct.includes('deficit')) {
            navActions.push({ label: 'Open Reorder Hub', path: '/reorder', icon: '🛒', title: 'Open purchasing & reorder hub' });
            navActions.push({ label: 'Stock Take Audit', path: '/stock-take', icon: '📋', title: 'Open physical stock take audit' });
          } else if (lowerAct.includes('overstock') || lowerAct.includes('valuation') || lowerAct.includes('capital') || lowerAct.includes('holding')) {
            navActions.push({ label: 'Financial Reports', path: '/reports', icon: '📈', title: 'Open reports and holding drag analysis' });
            navActions.push({ label: 'Inventory Manager', path: '/aim', icon: '📊', title: 'Open Advanced Inventory Manager' });
          } else if (lowerAct.includes('challan') || lowerAct.includes('dispatch')) {
            navActions.push({ label: 'Pending Challans', path: '/challans', icon: '🚚', title: 'Open delivery challans management' });
          }

          elements.push(
            <div
              key={`action-${i}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.04)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  {stepNum}
                </span>
                <div style={{ flex: 1, color: 'var(--text-primary)' }}>
                  {formatInline(actionText)}
                </div>
              </div>

              {/* Action Execution & ERP Deep Link Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingLeft: '26px' }}>
                {execPrompt && (
                  <button
                    type="button"
                    onClick={() => handleSend(execPrompt)}
                    title={`Run Copilot command: "${execPrompt}"`}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 9px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.38)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                      e.currentTarget.style.color = '#60a5fa';
                    }}
                  >
                    ⚡ Execute: {execPrompt}
                  </button>
                )}

                {navActions.map((na, nIdx) => (
                  <button
                    key={nIdx}
                    type="button"
                    onClick={() => navigate(na.path)}
                    title={na.title}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                  >
                    <span>{na.icon}</span>
                    <span>{na.label}</span>
                    <span style={{ fontSize: '9px', opacity: 0.6 }}>↗</span>
                  </button>
                ))}

                {execPrompt && (
                  <button
                    type="button"
                    onClick={() => handleLoadPromptForEdit(execPrompt)}
                    title="Edit this prompt before sending"
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-muted)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            </div>
          );
          i++;
          continue;
        }

        // 4. Standard bullet list
        if (line.startsWith('•') || line.startsWith('* ') || line.startsWith('- ')) {
          const clean = line.replace(/^[•*-]\s*/, '');
          elements.push(
            <div
              key={`bullet-${i}`}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
                paddingLeft: '4px',
                marginBottom: '4px',
              }}
            >
              <span style={{ color: 'var(--primary-hover)', fontSize: '13px', lineHeight: '1.2' }}>•</span>
              <div style={{ flex: 1 }}>{formatInline(clean)}</div>
            </div>
          );
          i++;
          continue;
        }

        // 5. Normal text / paragraph
        elements.push(
          <div key={`p-${i}`} style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-primary)', marginBottom: '4px' }}>
            {formatInline(line)}
          </div>
        );
        i++;
      }

      return elements;
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sections.map((section, sIdx) => {
          const hLower = section.heading.toLowerCase();
          let headingColor = 'var(--text-primary)';
          let headingIcon = '💡';
          let cardBg = 'rgba(255, 255, 255, 0.02)';
          let cardBorder = 'rgba(255, 255, 255, 0.08)';

          const isVerdict = hLower.includes('summary') || hLower.includes('verdict');
          const isTable = hLower.includes('table') || hLower.includes('breakdown') || hLower.includes('sku') || hLower.includes('catalog');
          const isDrivers = hLower.includes('metric') || hLower.includes('insight') || hLower.includes('kpi') || hLower.includes('driver');
          const isActions = hLower.includes('action') || hLower.includes('recommend') || hLower.includes('next');

          if (isVerdict) {
            headingColor = '#34d399';
            headingIcon = '📌';
            cardBg = 'rgba(16, 185, 129, 0.04)';
            cardBorder = 'rgba(16, 185, 129, 0.22)';
          } else if (isTable) {
            headingColor = '#38bdf8';
            headingIcon = '📊';
            cardBg = 'rgba(56, 189, 248, 0.03)';
            cardBorder = 'rgba(56, 189, 248, 0.18)';
          } else if (isDrivers) {
            headingColor = '#c084fc';
            headingIcon = '🔍';
            cardBg = 'rgba(192, 132, 252, 0.03)';
            cardBorder = 'rgba(192, 132, 252, 0.18)';
          } else if (isActions) {
            headingColor = '#60a5fa';
            headingIcon = '⚡';
            cardBg = 'rgba(59, 130, 246, 0.05)';
            cardBorder = 'rgba(59, 130, 246, 0.25)';
          }

          const kpiMetrics = isVerdict ? extractExecutiveMetrics(section.lines) : [];

          return (
            <div
              key={sIdx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                backgroundColor: cardBg,
                border: `1px solid ${cardBorder}`,
                borderRadius: '8px',
                padding: '9px 12px',
              }}
            >
              {section.heading && (
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: headingColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    marginBottom: '2px',
                  }}
                >
                  <span>{headingIcon}</span>
                  <span>{section.heading.replace(/^[^a-zA-Z0-9]+/, '') || section.heading}</span>
                </div>
              )}

              {/* Executive Hero KPI Ribbon */}
              {isVerdict && kpiMetrics.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(kpiMetrics.length, 4)}, minmax(0, 1fr))`,
                    gap: '6px',
                    margin: '3px 0 6px 0',
                  }}
                >
                  {kpiMetrics.map((m, mIdx) => {
                    const isDanger = m.trend === 'danger';
                    const isWarn = m.trend === 'warning';
                    return (
                      <div
                        key={mIdx}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          backgroundColor: isDanger
                            ? 'rgba(239, 68, 68, 0.08)'
                            : isWarn
                            ? 'rgba(245, 158, 11, 0.08)'
                            : 'rgba(56, 189, 248, 0.08)',
                          border: `1px solid ${
                            isDanger
                              ? 'rgba(239, 68, 68, 0.25)'
                              : isWarn
                              ? 'rgba(245, 158, 11, 0.25)'
                              : 'rgba(56, 189, 248, 0.25)'
                          }`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.03em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.label}
                        </div>
                        <div
                          style={{
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: isDanger ? '#f87171' : isWarn ? '#fbbf24' : '#38bdf8',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {m.value}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {renderSectionElements(section.lines)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floatable Action Trigger Button */}
      {/* Floatable Action Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          className={`no-print dost-float-trigger ${isDraggingBtn ? 'is-dragging' : 'is-idle'}`}
          onPointerDown={handlePointerDownBtn}
          onPointerMove={handlePointerMoveBtn}
          onPointerUp={handlePointerUpBtn}
          onPointerCancel={handlePointerUpBtn}
          onDoubleClick={handleResetButtonPos}
          style={{
            left: btnPos ? `${btnPos.x}px` : undefined,
            top: btnPos ? `${btnPos.y}px` : undefined,
            right: !btnPos ? '24px' : undefined,
            bottom: !btnPos ? '24px' : undefined,
            padding: '2px',
            borderRadius: '12px',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="DOST AI Assistant • Drag anywhere to reposition • Click to chat • Double-click to reset"
          aria-label="Open DOST AI Assistant"
        >
          <img
            src="/dost-bot.png"
            alt="DOST AI Assistant"
            style={{
              width: '56px',
              height: '56px',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
              userSelect: 'none',
              filter: isSuperAdmin ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.7))' : 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.6))',
            }}
          />
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div
          className="no-print dost-float-window"
          style={{
            left: windowPos ? `${windowPos.x}px` : undefined,
            top: windowPos ? `${windowPos.y}px` : undefined,
            right: !windowPos ? '24px' : undefined,
            bottom: !windowPos ? '24px' : undefined,
            width: isExpanded ? '540px' : '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: isExpanded ? '720px' : '620px',
            maxHeight: 'calc(100vh - 48px)',
            transition: isDraggingWindow ? 'none' : 'width 0.25s ease, height 0.25s ease',
            animation: !windowPos ? 'slideUpFade 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
            borderColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.4)' : undefined,
            boxShadow: isSuperAdmin ? '0 24px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(245, 158, 11, 0.3)' : undefined,
          }}
        >
          {/* Header (Draggable) */}
          <div
            className={`dost-float-header ${isDraggingWindow ? 'is-window-dragging' : ''}`}
            onPointerDown={handlePointerDownHeader}
            onPointerMove={handlePointerMoveHeader}
            onPointerUp={handlePointerUpHeader}
            onPointerCancel={handlePointerUpHeader}
            onDoubleClick={() => setWindowPos(null)}
            title="Drag header to move chat window • Double-click to reset position"
            style={{
              borderBottomColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.25)' : undefined
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}>
              <img
                src="/dost-bot.png"
                alt="DOST Bot"
                style={{
                  width: '36px',
                  height: '36px',
                  objectFit: 'contain',
                  flexShrink: 0,
                  display: 'block',
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    letterSpacing: '0.02em',
                  }}
                >
                  {isSuperAdmin ? 'DOST 👑' : 'DOST'}
                  <span
                    style={{
                      fontSize: '10px',
                      background: isSuperAdmin
                        ? 'rgba(245, 158, 11, 0.15)'
                        : executingType === 'insight'
                          ? 'rgba(124, 58, 237, 0.18)'
                          : executingType === 'action'
                            ? 'rgba(59, 130, 246, 0.18)'
                            : 'var(--primary-light)',
                      color: isSuperAdmin
                        ? '#fbbf24'
                        : executingType === 'insight'
                          ? '#c4b5fd'
                          : executingType === 'action'
                            ? '#93c5fd'
                            : 'var(--primary-hover)',
                      padding: '1px 7px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      transition: 'all 0.2s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    {isSuperAdmin
                      ? 'Platform'
                      : executingType === 'insight'
                        ? '🧠 Analysing'
                        : executingType === 'action'
                          ? '⚡ Executing'
                          : 'AI Copilot'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: isSuperAdmin ? '#fbbf24' : 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isSuperAdmin ? '#fbbf24' : 'var(--success)',
                      flexShrink: 0,
                    }}
                  ></span>
                  {isSuperAdmin ? 'System Control' : (activeOrg?.organizationName || 'Workspace')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {/* New Chat Button */}
              <button
                type="button"
                onClick={handleNewChat}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title="Start new conversation"
              >
                <IconPlus size={15} />
              </button>

              {/* Chat History & Tracker Drawer Button */}
              <button
                type="button"
                onClick={() => setShowHistoryDrawer((prev) => !prev)}
                className="btn-icon"
                style={{
                  color: showHistoryDrawer ? 'var(--primary)' : 'var(--text-secondary)',
                  backgroundColor: showHistoryDrawer ? 'var(--primary-light)' : 'transparent',
                  padding: '5px',
                  position: 'relative',
                }}
                title="Chat history & session tracking"
              >
                <IconClock size={15} />
                {sessions.length > 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      right: '3px',
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                    }}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => setWindowPos(null)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title="Reset window position"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title={isExpanded ? 'Standard view' : 'Expanded view'}
              >
                <IconBarChart size={15} />
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title="Clear current conversation"
              >
                <IconTrash size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title="Minimize"
              >
                <IconMinimize size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '5px' }}
                title="Close"
              >
                <IconX size={15} />
              </button>
            </div>
          </div>

          {/* Chat History & Analytics Overlay Drawer */}
          {showHistoryDrawer && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'var(--bg-secondary)',
                zIndex: 40,
                display: 'flex',
                flexDirection: 'column',
                borderTop: '1px solid var(--border-color)',
                backdropFilter: 'blur(16px)',
              }}
            >
              {/* Drawer Header & Metrics */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  backgroundColor: 'var(--bg-tertiary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <IconClock size={16} style={{ color: 'var(--primary-hover)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.01em' }}>
                      Chat History & Tracking
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handleNewChat}
                      style={{
                        padding: '4px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: '#7c3aed',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                      }}
                    >
                      <IconPlus size={12} />
                      <span>New Chat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHistoryDrawer(false)}
                      className="btn-icon"
                      style={{ color: 'var(--text-secondary)', padding: '4px' }}
                      title="Close history"
                    >
                      <IconX size={15} />
                    </button>
                  </div>
                </div>

                {/* 4-Metric Measurement & Analytics Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{chatMetrics.totalSessions}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Sessions</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{chatMetrics.totalQueries}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Queries</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fbbf24' }}>{chatMetrics.actionsExecuted}</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Actions</div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#34d399' }}>{chatMetrics.helpfulRate}%</div>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Helpful</div>
                  </div>
                </div>

                {/* Search Bar */}
                <input
                  type="text"
                  placeholder="Search past conversations..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    padding: '6px 10px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Sessions List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    No conversations match your search.
                  </div>
                ) : (
                  filteredSessions.map((s) => {
                    const isActive = s.id === currentSessionId;
                    const queryCount = s.messages.filter((m: ChatMessage) => m.sender === 'user').length;
                    const likeCount = s.messages.filter((m: ChatMessage) => m.feedback === 'like').length;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSwitchSession(s.id)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                          border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {isActive && (
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--primary)',
                                  flexShrink: 0,
                                }}
                              />
                            )}
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                              }}
                            >
                              {s.title}
                            </span>
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span>
                              {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span>•</span>
                            <span>{queryCount} {queryCount === 1 ? 'query' : 'queries'}</span>
                            {likeCount > 0 && (
                              <>
                                <span>•</span>
                                <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                  <IconThumbUp size={9} /> {likeCount}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(e, s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            padding: '4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Delete conversation"
                        >
                          <IconTrash size={13} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Clear All History Button */}
              {sessions.length > 1 && (
                <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--bg-tertiary)' }}>
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--danger)',
                      fontSize: '11px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontWeight: 700,
                    }}
                  >
                    Clear All History
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Action Prompt Chips Bar */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              scrollbarWidth: 'none',
            }}
          >
            {topQuickPrompts.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => handleLoadPromptForEdit(q.prompt)}
                title={`Load "${q.prompt}" into input to edit`}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.4)';
                  e.currentTarget.style.backgroundColor = 'rgba(124, 58, 237, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                }}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Messages Stream Area */}
          <div
            style={{
              flex: 1,
              padding: '14px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {(() => {
              const lastAiIndex = messages.map((m) => m.sender).lastIndexOf('ai');
              return messages.map((m, idx) => {
                const isAi = m.sender === 'ai';

                // Prevent rendering empty placeholder box when AI is still reasoning
                if (isAi && !m.text.trim() && !m.action && !m.cardData) {
                  return null;
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isAi ? 'flex-start' : 'flex-end',
                      maxWidth: isAi ? '100%' : '85%',
                      alignSelf: isAi ? 'flex-start' : 'flex-end',
                      width: isAi ? '100%' : 'auto',
                    }}
                  >
                    <div
                      style={{
                        padding: isAi ? '12px 16px' : '9px 15px',
                        borderRadius: isAi ? '4px 14px 14px 14px' : '16px 16px 4px 16px',
                        backgroundColor: isAi ? 'var(--bg-tertiary)' : '#6d28d9',
                        background: isAi ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        color: isAi ? 'var(--text-primary)' : '#ffffff',
                        fontWeight: isAi ? 400 : 500,
                        border: isAi ? '1px solid var(--border-color)' : '1px solid rgba(167, 139, 250, 0.4)',
                        fontSize: '13px',
                        lineHeight: '1.55',
                        boxShadow: isAi
                          ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                          : '0 4px 14px rgba(109, 40, 217, 0.35)',
                        width: isAi ? '100%' : 'fit-content',
                        maxWidth: '100%',
                        wordBreak: 'break-word',
                      }}
                    >
                      {isAi ? (
                        renderFormattedText(m.text)
                      ) : (
                        <span style={{ color: '#ffffff', fontWeight: 500, fontSize: '13px', whiteSpace: 'pre-wrap' }}>
                          {m.text}
                        </span>
                      )}

                    {/* ==================================================== */}
                    {/* INTERACTIVE ACTION PERMISSION CARD */}
                    {/* ==================================================== */}
                    {m.action && (
                      <div
                        style={{
                          marginTop: '12px',
                          background: m.action.isSerious
                            ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, var(--bg-elevated) 100%)'
                            : 'var(--bg-elevated)',
                          border: m.action.isSerious
                            ? '1.5px solid rgba(239, 68, 68, 0.5)'
                            : '1.5px solid rgba(124, 58, 237, 0.4)',
                          borderRadius: '10px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          boxShadow: m.action.isSerious
                            ? '0 4px 20px rgba(239, 68, 68, 0.2)'
                            : '0 4px 20px rgba(124, 58, 237, 0.18)',
                        }}
                      >
                        {/* Header with Shield / Alert Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            paddingBottom: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {m.action.isSerious ? (
                              <IconAlertTriangle size={17} style={{ color: 'var(--danger)' }} />
                            ) : (
                              <IconShield size={17} style={{ color: 'var(--primary-hover)' }} />
                            )}
                            <span
                              style={{
                                fontWeight: 800,
                                fontSize: '13px',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {m.action.title}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: '9.5px',
                              fontWeight: 800,
                              letterSpacing: '0.04em',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              color: m.action.isSerious ? '#ef4444' : '#d4d4d4',
                              backgroundColor: m.action.isSerious
                                ? 'rgba(239, 68, 68, 0.18)'
                                : 'rgba(212, 212, 212, 0.1)',
                              border: m.action.isSerious
                                ? '1px solid rgba(239, 68, 68, 0.35)'
                                : '1px solid rgba(255, 255, 255, 0.2)',
                            }}
                          >
                            {m.action.isSerious ? '🚨 SERIOUS ACTION' : '🛡️ PERMISSION REQUIRED'}
                          </span>
                        </div>

                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {m.action.description}
                        </div>

                        {/* Interactive Form Controls for CREATE_CHALLAN */}
                        {m.action.actionType === 'CREATE_CHALLAN' &&
                          m.action.status === 'PENDING' &&
                          m.action.availableCustomers &&
                          m.action.availableProducts && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                padding: '10px',
                                borderRadius: '6px',
                              }}
                            >
                              {/* Customer Picker */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--text-tertiary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  Customer:
                                </label>
                                <select
                                  value={m.action.params.customerId}
                                  onChange={(e) => {
                                    const newCustId = e.target.value;
                                    handleUpdateActionParams(m.id, (prev) => {
                                      const cust = prev.availableCustomers?.find(
                                        (c) => c.id === newCustId
                                      );
                                      return {
                                        ...prev,
                                        params: { ...prev.params, customerId: newCustId },
                                        summaryDetails: prev.summaryDetails.map((s) =>
                                          s.label === 'Customer'
                                            ? {
                                              ...s,
                                              value: cust?.businessName || cust?.name || '—',
                                            }
                                            : s
                                        ),
                                      };
                                    });
                                  }}
                                  style={{
                                    fontSize: '12px',
                                    padding: '5px 8px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {m.action.availableCustomers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.businessName ? `${c.businessName} (${c.name})` : c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Product & Qty Picker */}
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-tertiary)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Product Item:
                                  </label>
                                  <select
                                    value={m.action.params.items[0]?.productId}
                                    onChange={(e) => {
                                      const newProdId = e.target.value;
                                      handleUpdateActionParams(m.id, (prev) => {
                                        const prod = prev.availableProducts?.find(
                                          (p) => p.id === newProdId
                                        );
                                        const curQty = prev.params.items[0]?.quantity || 1;
                                        const unitPrice = prod?.unitPrice || 0;
                                        const total = unitPrice * curQty;
                                        return {
                                          ...prev,
                                          params: {
                                            ...prev.params,
                                            items: [{ productId: newProdId, quantity: curQty }],
                                          },
                                          summaryDetails: [
                                            {
                                              label: 'Customer',
                                              value:
                                                prev.summaryDetails.find(
                                                  (s) => s.label === 'Customer'
                                                )?.value || '—',
                                              highlight: true,
                                            },
                                            {
                                              label: 'Product Item',
                                              value: `${prod?.name} (${prod?.sku})`,
                                            },
                                            {
                                              label: 'Dispatch Quantity',
                                              value: `${curQty} units`,
                                              highlight: true,
                                              color: '#38bdf8',
                                            },
                                            {
                                              label: 'Unit Price',
                                              value: `₹${unitPrice.toLocaleString('en-IN')}`,
                                            },
                                            {
                                              label: 'Est. Total Value',
                                              value: `₹${total.toLocaleString('en-IN')}`,
                                              color: 'var(--success)',
                                            },
                                            {
                                              label: 'Available Stock',
                                              value: `${prod?.currentStock} units in warehouse`,
                                            },
                                          ],
                                        };
                                      });
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      padding: '5px 8px',
                                      backgroundColor: 'var(--bg-elevated)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {m.action.availableProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (Stock: {p.currentStock})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Quantity Stepper */}
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    width: '100px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-tertiary)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Quantity:
                                  </label>
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateActionParams(m.id, (prev) => {
                                          const curQty = prev.params.items[0]?.quantity || 1;
                                          const newQty = Math.max(1, curQty - 1);
                                          const prod = prev.availableProducts?.find(
                                            (p) => p.id === prev.params.items[0]?.productId
                                          );
                                          const unitPrice = prod?.unitPrice || 0;
                                          return {
                                            ...prev,
                                            params: {
                                              ...prev.params,
                                              items: [
                                                {
                                                  ...prev.params.items[0],
                                                  quantity: newQty,
                                                },
                                              ],
                                            },
                                            summaryDetails: prev.summaryDetails.map((s) => {
                                              if (s.label === 'Dispatch Quantity')
                                                return { ...s, value: `${newQty} units` };
                                              if (s.label === 'Est. Total Value')
                                                return {
                                                  ...s,
                                                  value: `₹${(unitPrice * newQty).toLocaleString(
                                                    'en-IN'
                                                  )}`,
                                                };
                                              return s;
                                            }),
                                          };
                                        });
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      -
                                    </button>
                                    <span
                                      style={{
                                        flex: 1,
                                        textAlign: 'center',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                      }}
                                    >
                                      {m.action.params.items[0]?.quantity || 1}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateActionParams(m.id, (prev) => {
                                          const curQty = prev.params.items[0]?.quantity || 1;
                                          const newQty = curQty + 1;
                                          const prod = prev.availableProducts?.find(
                                            (p) => p.id === prev.params.items[0]?.productId
                                          );
                                          const unitPrice = prod?.unitPrice || 0;
                                          return {
                                            ...prev,
                                            params: {
                                              ...prev.params,
                                              items: [
                                                {
                                                  ...prev.params.items[0],
                                                  quantity: newQty,
                                                },
                                              ],
                                            },
                                            summaryDetails: prev.summaryDetails.map((s) => {
                                              if (s.label === 'Dispatch Quantity')
                                                return { ...s, value: `${newQty} units` };
                                              if (s.label === 'Est. Total Value')
                                                return {
                                                  ...s,
                                                  value: `₹${(unitPrice * newQty).toLocaleString(
                                                    'en-IN'
                                                  )}`,
                                                };
                                              return s;
                                            }),
                                          };
                                        });
                                      }}
                                      style={{
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: 'none',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Interactive Controls for START_SUPPORT_SESSION */}
                        {m.action.actionType === 'START_SUPPORT_SESSION' &&
                          m.action.status === 'PENDING' && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                padding: '10px',
                                borderRadius: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                  Target User Email / ID:
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. admin@tenant.com"
                                  value={m.action.params.targetUserId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateActionParams(m.id, (prev) => ({
                                      ...prev,
                                      params: { ...prev.params, targetUserId: val },
                                    }));
                                  }}
                                  style={{
                                    fontSize: '12px',
                                    padding: '5px 8px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                  }}
                                />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                  Reason for Support:
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g. Resolving billing discrepancy"
                                  value={m.action.params.reason}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateActionParams(m.id, (prev) => ({
                                      ...prev,
                                      params: { ...prev.params, reason: val },
                                      summaryDetails: [
                                        ...prev.summaryDetails.filter(s => s.label !== 'Reason'),
                                        { label: 'Reason', value: val }
                                      ]
                                    }));
                                  }}
                                  style={{
                                    fontSize: '12px',
                                    padding: '5px 8px',
                                    backgroundColor: 'var(--bg-elevated)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                  }}
                                />
                              </div>
                            </div>
                          )}

                        {/* Interactive Controls for MOVE_STOCK */}
                        {m.action.actionType === 'MOVE_STOCK' &&
                          m.action.status === 'PENDING' &&
                          m.action.availableProducts && (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                padding: '10px',
                                borderRadius: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <div
                                  style={{
                                    flex: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-tertiary)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Product:
                                  </label>
                                  <select
                                    value={m.action.params.productId}
                                    onChange={(e) => {
                                      const newProdId = e.target.value;
                                      handleUpdateActionParams(m.id, (prev) => {
                                        const prod = prev.availableProducts?.find(
                                          (p) => p.id === newProdId
                                        );
                                        const qty = prev.params.quantity || 10;
                                        const moveType = prev.params.type;
                                        const curStock = prod?.currentStock || 0;
                                        const newStock =
                                          moveType === 'IN'
                                            ? curStock + qty
                                            : Math.max(0, curStock - qty);
                                        return {
                                          ...prev,
                                          params: { ...prev.params, productId: newProdId },
                                          summaryDetails: [
                                            {
                                              label: 'Product',
                                              value: `${prod?.name} (${prod?.sku})`,
                                              highlight: true,
                                            },
                                            {
                                              label: 'Movement Type',
                                              value: `${moveType} (${moveType === 'IN'
                                                ? 'Inward / Add'
                                                : 'Outward / Deduct'
                                                })`,
                                              color:
                                                moveType === 'IN'
                                                  ? 'var(--success)'
                                                  : 'var(--danger)',
                                            },
                                            {
                                              label: 'Quantity to Move',
                                              value: `${moveType === 'IN' ? '+' : '-'}${qty} units`,
                                              highlight: true,
                                            },
                                            {
                                              label: 'Current Stock',
                                              value: `${curStock} units`,
                                            },
                                            {
                                              label: 'Projected Stock After Movement',
                                              value: `${newStock} units`,
                                              highlight: true,
                                              color:
                                                moveType === 'IN' ? 'var(--success)' : '#f59e0b',
                                            },
                                            { label: 'Reason', value: prev.params.reason },
                                          ],
                                        };
                                      });
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      padding: '5px 8px',
                                      backgroundColor: 'var(--bg-elevated)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    {m.action.availableProducts.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (Stock: {p.currentStock})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    width: '100px',
                                  }}
                                >
                                  <label
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-tertiary)',
                                      fontWeight: 600,
                                    }}
                                  >
                                    Quantity:
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={m.action.params.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value, 10) || 1;
                                      handleUpdateActionParams(m.id, (prev) => {
                                        const prod = prev.availableProducts?.find(
                                          (p) => p.id === prev.params.productId
                                        );
                                        const moveType = prev.params.type;
                                        const curStock = prod?.currentStock || 0;
                                        const newStock =
                                          moveType === 'IN'
                                            ? curStock + newQty
                                            : Math.max(0, curStock - newQty);
                                        return {
                                          ...prev,
                                          params: { ...prev.params, quantity: newQty },
                                          summaryDetails: prev.summaryDetails.map((s) => {
                                            if (s.label === 'Quantity to Move')
                                              return {
                                                ...s,
                                                value: `${moveType === 'IN' ? '+' : '-'}${newQty} units`,
                                              };
                                            if (s.label === 'Projected Stock After Movement')
                                              return { ...s, value: `${newStock} units` };
                                            return s;
                                          }),
                                        };
                                      });
                                    }}
                                    style={{
                                      fontSize: '12px',
                                      padding: '5px 8px',
                                      backgroundColor: 'var(--bg-elevated)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      textAlign: 'center',
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Parameter Summary Grid */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            backgroundColor: 'rgba(0, 0, 0, 0.25)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                          }}
                        >
                          {m.action.summaryDetails.map((detail, dIdx) => (
                            <div
                              key={dIdx}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ color: 'var(--text-tertiary)' }}>{detail.label}:</span>
                              <strong
                                style={{
                                  color: detail.color || 'var(--text-primary)',
                                  fontWeight: detail.highlight ? 700 : 500,
                                }}
                              >
                                {detail.value}
                              </strong>
                            </div>
                          ))}
                        </div>

                        {/* Status Handling: PENDING, EXECUTING, COMPLETED, REJECTED, FAILED */}
                        {m.action.status === 'PENDING' && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '8px',
                              marginTop: '4px',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              onClick={() => handleRejectAction(m.id)}
                              className="btn"
                              style={{
                                padding: '6px 12px',
                                fontSize: '11.5px',
                                background: 'transparent',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                borderRadius: '6px',
                                cursor: 'pointer',
                              }}
                            >
                              ✕ Reject
                            </button>

                            <button
                              onClick={() => handleApproveAction(m.id, m.action!)}
                              className="btn"
                              style={{
                                padding: '6px 14px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                background: m.action.isSerious
                                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                boxShadow: m.action.isSerious
                                  ? '0 2px 8px rgba(239, 68, 68, 0.4)'
                                  : '0 2px 8px rgba(34, 197, 94, 0.4)',
                              }}
                            >
                              <IconCheck size={14} />
                              {m.action.isSerious ? 'Authorize & Execute' : 'Approve & Execute'}
                            </button>
                          </div>
                        )}

                        {m.action.status === 'EXECUTING' && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '8px',
                              color: 'var(--text-secondary)',
                              fontSize: '12px',
                            }}
                          >
                            <div
                              className="spinner"
                              style={{ width: '14px', height: '14px', borderWidth: '2px' }}
                            ></div>
                            Executing action in live workspace database...
                          </div>
                        )}

                        {m.action.status === 'COMPLETED' && (
                          <div
                            style={{
                              backgroundColor: 'rgba(34, 197, 94, 0.15)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              padding: '10px 12px',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div
                              style={{
                                color: 'var(--success)',
                                fontWeight: 700,
                                fontSize: '12.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <IconCheck size={16} />
                              {m.action.actionType === 'CREATE_CHALLAN' &&
                                `Challan #${m.action.executionResult?.challanNumber || ''} Created Successfully!`}
                              {m.action.actionType === 'MOVE_STOCK' &&
                                'Stock Movement Recorded Successfully!'}
                              {m.action.actionType === 'CONFIRM_CHALLAN' &&
                                'Challan Confirmed & Inventory Deducted!'}
                              {m.action.actionType === 'CANCEL_CHALLAN' &&
                                'Challan Cancelled Successfully!'}
                              {m.action.actionType === 'CREATE_CUSTOMER' &&
                                'Customer Account Created!'}
                              {m.action.actionType === 'CREATE_PRODUCT' &&
                                'Product Added to Catalog!'}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                borderTop: '1px solid rgba(34, 197, 94, 0.2)',
                                paddingTop: '6px',
                              }}
                            >
                              {m.action.actionType === 'CREATE_CHALLAN' && (
                                <>
                                  <button
                                    onClick={() => {
                                      if (m.action?.executionResult?.id) {
                                        void handleSend(
                                          `Confirm challan ${m.action.executionResult.challanNumber}`
                                        );
                                      }
                                    }}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      border: '1px solid var(--border-color)',
                                      color: 'var(--text-primary)',
                                      borderRadius: '4px',
                                      padding: '3px 8px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    🚚 Confirm Dispatch
                                  </button>

                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate('/challans');
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--primary-hover)',
                                      fontWeight: 700,
                                      fontSize: '11.5px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                    }}
                                  >
                                    View in Challans <IconArrowRight size={13} />
                                  </button>
                                </>
                              )}

                              {m.action.actionType === 'MOVE_STOCK' && (
                                <button
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate('/products');
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-hover)',
                                    fontWeight: 700,
                                    fontSize: '11.5px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  View Catalog <IconArrowRight size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {m.action.status === 'REJECTED' && (
                          <div
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              color: 'var(--text-tertiary)',
                              fontSize: '11.5px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span>✕</span>
                            Action rejected & cancelled by user. No data modified.
                          </div>
                        )}

                        {m.action.status === 'FAILED' && (
                          <div
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.15)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              color: 'var(--danger)',
                              fontSize: '11.5px',
                            }}
                          >
                            ⚠️ {m.action.errorMessage || 'Execution failed.'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: BILL OF MATERIALS (BOM) */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'bom' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        {/* High level BOM stat banner */}
                        {m.cardData.stats && (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background:
                                'linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(124, 58, 237, 0.12))',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                            }}
                          >
                            <div>
                              <span style={{ color: 'var(--text-tertiary)' }}>Total Pipeline Value: </span>
                              <strong style={{ color: 'var(--success)' }}>
                                ₹{Number(m.cardData.stats.totalPipelineValue || 0).toLocaleString('en-IN')}
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: 'var(--text-tertiary)' }}>Ready Assemblies: </span>
                              <strong style={{ color: '#38bdf8' }}>
                                {m.cardData.stats.readyBundles} / {m.cardData.stats.totalRecipes} kits
                              </strong>
                            </div>
                          </div>
                        )}

                        {m.cardData.items.map((bom: any) => {
                          const canBuild = (bom.canAssembleQty || 0) > 0;
                          return (
                            <div
                              key={bom.id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: canBuild
                                  ? '1px solid rgba(34, 197, 94, 0.35)'
                                  : '1px solid rgba(239, 68, 68, 0.35)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.18)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                  gap: '8px',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '13px',
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    {bom.bundleName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-tertiary)',
                                      marginTop: '2px',
                                    }}
                                  >
                                    SKU: <span style={{ color: 'var(--text-secondary)' }}>{bom.sku}</span>{' '}
                                    • <span>{bom.category}</span>
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '13.5px',
                                      color: 'var(--success)',
                                    }}
                                  >
                                    ₹{Number(bom.sellingPrice || 0).toLocaleString('en-IN')}
                                  </div>
                                  <span
                                    style={{
                                      display: 'inline-block',
                                      marginTop: '3px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      padding: '2px 8px',
                                      borderRadius: '9999px',
                                      backgroundColor: canBuild
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)',
                                      color: canBuild ? '#22c55e' : '#ef4444',
                                      border: canBuild
                                        ? '1px solid rgba(34, 197, 94, 0.3)'
                                        : '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    {canBuild
                                      ? `⚡ ${bom.canAssembleQty} kits buildable`
                                      : '⚠️ Stock Bottleneck'}
                                  </span>
                                </div>
                              </div>

                              {/* Component Breakdown list */}
                              <div
                                style={{
                                  backgroundColor: 'rgba(0, 0, 0, 0.25)',
                                  borderRadius: '6px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '5px',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '10.5px',
                                    color: 'var(--text-tertiary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  Recipe Components:
                                </div>
                                {bom.components?.map((c: any, cIdx: number) => {
                                  const hasEnough = (c.currentStock || 0) >= c.qtyRequired;
                                  return (
                                    <div
                                      key={cIdx}
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '11px',
                                      }}
                                    >
                                      <span style={{ color: 'var(--text-secondary)' }}>
                                        • {c.productName} ({c.qtyRequired}x req)
                                      </span>
                                      <span
                                        style={{
                                          fontWeight: 700,
                                          color: hasEnough ? '#22c55e' : '#ef4444',
                                          fontSize: '10.5px',
                                        }}
                                      >
                                        {c.currentStock ?? 0} on hand {hasEnough ? '✓' : '✗'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Card footer actions */}
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderTop: '1px solid var(--border-color)',
                                  paddingTop: '8px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsOpen(false);
                                    navigate('/assemblies');
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-hover)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  Open BOM Module <IconArrowRight size={12} />
                                </button>

                                {canBuild && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleSend(`Build assembly for ${bom.bundleName}`)
                                    }
                                    style={{
                                      background: 'linear-gradient(135deg, #10b981, #059669)',
                                      color: '#ffffff',
                                      border: 'none',
                                      borderRadius: '5px',
                                      padding: '4px 10px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                    }}
                                  >
                                    🛠️ Build Assembly (1x)
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: CHALLANS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'challans' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {m.cardData.items.map((ch: any) => {
                          const statusColor =
                            ch.status === 'CONFIRMED'
                              ? '#22c55e'
                              : ch.status === 'CANCELLED'
                                ? '#ef4444'
                                : '#f59e0b';
                          const statusBg =
                            ch.status === 'CONFIRMED'
                              ? 'rgba(34, 197, 94, 0.15)'
                              : ch.status === 'CANCELLED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)';

                          const computedTotalAmount = Array.isArray(ch.items)
                            ? ch.items.reduce(
                              (sum: number, it: any) =>
                                sum + (Number(it.unitPrice || 0) * Number(it.quantity || 0)),
                              0
                            )
                            : 0;

                          return (
                            <div
                              key={ch.id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                  }}
                                >
                                  {ch.challanNumber}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '9999px',
                                    color: statusColor,
                                    backgroundColor: statusBg,
                                    border: `1px solid ${statusColor}40`,
                                  }}
                                >
                                  {ch.status}
                                </span>
                              </div>

                              <div style={{ color: 'var(--text-secondary)', fontSize: '11.5px' }}>
                                👤 Customer:{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {ch.customer?.name || ch.customer?.businessName || '—'}
                                </strong>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '11px',
                                  color: 'var(--text-tertiary)',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                  paddingTop: '6px',
                                }}
                              >
                                <span>
                                  📦 Qty: <strong>{ch.totalQuantity || 0} units</strong>
                                  {computedTotalAmount > 0 && (
                                    <> • ₹{computedTotalAmount.toLocaleString('en-IN')}</>
                                  )}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  {ch.status === 'DRAFT' && (
                                    <button
                                      onClick={() =>
                                        void handleSend(`Confirm challan ${ch.challanNumber}`)
                                      }
                                      style={{
                                        background: 'rgba(34, 197, 94, 0.15)',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                        color: 'var(--success)',
                                        cursor: 'pointer',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      Confirm
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate('/challans');
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--primary-hover)',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      fontWeight: 600,
                                      fontSize: '11px',
                                      padding: '0',
                                    }}
                                  >
                                    Open <IconArrowRight size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: PRODUCTS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'products' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {m.cardData.items.map((prod: any) => {
                          const isCritical = (prod.currentStock || 0) === 0;
                          const isLow =
                            !isCritical &&
                            (prod.currentStock || 0) <= (prod.minimumStock || 0);
                          const stockColor = isCritical
                            ? '#ef4444'
                            : isLow
                              ? '#f59e0b'
                              : '#22c55e';
                          const stockStatus = isCritical
                            ? 'OUT OF STOCK'
                            : isLow
                              ? 'LOW STOCK'
                              : 'HEALTHY';

                          return (
                            <div
                              key={prod.id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'flex-start',
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                      fontSize: '13px',
                                    }}
                                  >
                                    {prod.name}
                                  </div>
                                  <div
                                    style={{
                                      color: 'var(--text-tertiary)',
                                      fontSize: '11px',
                                      fontFamily: 'var(--font-mono)',
                                    }}
                                  >
                                    SKU: {prod.sku} • {prod.category || 'General'}
                                  </div>
                                </div>
                                <span
                                  style={{
                                    fontSize: '9.5px',
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    color: stockColor,
                                    backgroundColor: `${stockColor}20`,
                                  }}
                                >
                                  {stockStatus}
                                </span>
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginTop: '2px',
                                  fontSize: '11.5px',
                                  color: 'var(--text-secondary)',
                                  backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                  padding: '6px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                <span>
                                  Stock:{' '}
                                  <strong style={{ color: stockColor }}>
                                    {prod.currentStock || 0}
                                  </strong>{' '}
                                  / Min: {prod.minimumStock || 0}
                                </span>
                                <span>
                                  Price:{' '}
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    ₹{Number(prod.unitPrice || 0).toLocaleString('en-IN')}
                                  </strong>
                                </span>
                              </div>

                              <div
                                style={{
                                  fontSize: '10.5px',
                                  color: 'var(--text-tertiary)',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <span>📍 {prod.warehouseLocation || 'Main Godown'}</span>
                                <button
                                  onClick={() =>
                                    void handleSend(`Inward 20 stock for ${prod.name}`)
                                  }
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary-hover)',
                                    cursor: 'pointer',
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    padding: 0,
                                  }}
                                >
                                  + Inward Stock
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: CUSTOMERS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'customers' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {m.cardData.items.map((cust: any) => (
                          <div
                            key={cust.id}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                {cust.name}
                              </div>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  color:
                                    cust.status === 'ACTIVE' ? 'var(--success)' : '#a3a3a3',
                                  backgroundColor:
                                    cust.status === 'ACTIVE'
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : 'rgba(163, 163, 163, 0.12)',
                                }}
                              >
                                {cust.status}
                              </span>
                            </div>

                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {cust.businessName ? `🏢 ${cust.businessName} • ` : ''}
                              {cust.email || cust.mobile || 'No contact specified'}
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '4px',
                              }}
                            >
                              {cust.gstNumber ? (
                                <span
                                  style={{
                                    color: 'var(--text-tertiary)',
                                    fontSize: '10px',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  GST: {cust.gstNumber}
                                </span>
                              ) : (
                                <span />
                              )}
                              <button
                                onClick={() =>
                                  void handleSend(
                                    `Create delivery challan for ${cust.businessName || cust.name}`
                                  )
                                }
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary-hover)',
                                  cursor: 'pointer',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: 0,
                                }}
                              >
                                + Create Challan
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: STOCK MOVEMENTS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'movements' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        {m.cardData.items.map((mov: any) => {
                          const isIn = mov.type === 'IN';
                          return (
                            <div
                              key={mov.id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '8px 10px',
                                fontSize: '11.5px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {mov.product?.name || 'Product'}
                                </div>
                                <div
                                  style={{ color: 'var(--text-tertiary)', fontSize: '10.5px' }}
                                >
                                  {mov.reason || 'Inventory adjustment'} •{' '}
                                  {new Date(mov.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  color: isIn ? 'var(--success)' : '#38bdf8',
                                  backgroundColor: isIn
                                    ? 'rgba(34, 197, 94, 0.15)'
                                    : 'rgba(56, 189, 248, 0.15)',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                }}
                              >
                                {isIn ? `+${mov.quantity}` : `-${mov.quantity}`} {mov.type}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: STATS / KPI GRID */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'stats' && m.cardData.stats && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                        }}
                      >
                        <div
                          style={{
                            background: 'var(--bg-elevated)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            Total Products
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {m.cardData.stats.products.total}
                          </div>
                        </div>

                        <div
                          style={{
                            background: 'var(--bg-elevated)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            Stock Valuation
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: 'var(--success)',
                            }}
                          >
                            ₹
                            {Number(
                              m.cardData.stats.products.totalStockValue || 0
                            ).toLocaleString('en-IN')}
                          </div>
                        </div>

                        <div
                          style={{
                            background: 'var(--bg-elevated)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            Draft Challans
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#f59e0b',
                            }}
                          >
                            {m.cardData.stats.challans.totalDraft}
                          </div>
                        </div>

                        <div
                          style={{
                            background: 'var(--bg-elevated)',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>
                            Confirmed Challans
                          </div>
                          <div
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: 'var(--primary-hover)',
                            }}
                          >
                            {m.cardData.stats.challans.totalConfirmed}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: SYSTEM HEALTH */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'system_health' && m.cardData.stats && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1.5px solid rgba(245, 158, 11, 0.3)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Database Status:</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              color: m.cardData.stats.dbStatus === 'healthy' ? '#22c55e' : '#ef4444',
                              backgroundColor: m.cardData.stats.dbStatus === 'healthy' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            }}
                          >
                            ● ONLINE
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>DB Response Latency:</span>
                          <strong style={{ color: m.cardData.stats.dbLatencyMs < 50 ? 'var(--success)' : '#f59e0b' }}>
                            {m.cardData.stats.dbLatencyMs} ms
                          </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span>
                          <strong style={{ color: 'var(--text-primary)' }}>
                            {(m.cardData.stats.uptime / 3600 / 24).toFixed(2)} Days
                          </strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Environment:</span>
                          <strong style={{ color: '#38bdf8' }}>{m.cardData.stats.environment.toUpperCase()}</strong>
                        </div>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: PLATFORM METRICS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'platform_metrics' && m.cardData.stats && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '6px',
                        }}
                      >
                        <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid rgba(245, 158, 11, 0.25)' }}>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Total Tenants</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{m.cardData.stats.totalOrganizations}</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid rgba(245, 158, 11, 0.25)' }}>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Active Tenants</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--success)' }}>{m.cardData.stats.activeOrganizations}</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid rgba(245, 158, 11, 0.25)' }}>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Subscriptions</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#38bdf8' }}>{m.cardData.stats.activeSubscriptions}</div>
                        </div>
                        <div style={{ background: 'var(--bg-elevated)', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid rgba(245, 158, 11, 0.25)' }}>
                          <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>Pending Payments</div>
                          <div style={{ fontSize: '16px', fontWeight: 800, color: '#f59e0b' }}>{m.cardData.stats.pendingPaymentRequests}</div>
                        </div>
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: TENANT ORGANIZATIONS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'organizations' && m.cardData.items && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {m.cardData.items.map((org: any) => {
                          const statusColor = org.status === 'ACTIVE' ? '#22c55e' : org.status === 'SUSPENDED' ? '#ef4444' : '#f59e0b';
                          return (
                            <div
                              key={org.id}
                              style={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{org.name}</strong>
                                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', color: statusColor, backgroundColor: `${statusColor}18` }}>
                                  {org.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                <span>🔑 Slug: <strong>{org.slug}</strong></span>
                                <span>Plan: <strong style={{ color: '#38bdf8' }}>{org.activeSubscription?.planName || 'TRIAL'}</strong></span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px', color: 'var(--text-tertiary)' }}>
                                <span>👥 {org.counts.memberships} Users • 📦 {org.counts.products} Prods</span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => void handleSend(`${org.status === 'ACTIVE' ? 'Suspend' : 'Activate'} org ${org.slug}`)}
                                    style={{
                                      background: 'rgba(255, 255, 255, 0.04)',
                                      border: '1px solid var(--border-color)',
                                      color: org.status === 'ACTIVE' ? '#ef4444' : '#22c55e',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {org.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={() => void handleSend(`impersonate for ${org.slug}`)}
                                    style={{
                                      background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                      border: 'none',
                                      color: '#ffffff',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Support
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: UPI PAYMENT REQUESTS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'payment_requests' && m.cardData.items && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {m.cardData.items.map((pay: any) => (
                          <div
                            key={pay.id}
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              fontSize: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{pay.organization?.name || 'Tenant'}</strong>
                              <strong style={{ color: 'var(--success)' }}>₹{Number(pay.amountINR).toLocaleString('en-IN')}</strong>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              UTR: <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>{pay.referenceNumber}</span> • Plan: {pay.plan?.name || 'Growth'}
                            </div>
                            {pay.proofUrl && (
                              <a
                                href={pay.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '11px', color: 'var(--primary-hover)', textDecoration: 'underline', alignSelf: 'flex-start' }}
                              >
                                🖼️ View Payment Proof Screenshot
                              </a>
                            )}
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
                              <button
                                onClick={() => void handleSend(`reject payment ${pay.referenceNumber}`)}
                                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => void handleSend(`approve payment ${pay.referenceNumber}`)}
                                style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22c55e', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}
                              >
                                Approve
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: PLATFORM AUDIT LOGS */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'audit_logs' && m.cardData.items && (
                      <div
                        style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          maxHeight: '260px',
                          overflowY: 'auto',
                          backgroundColor: 'rgba(0, 0, 0, 0.15)',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                      >
                        {m.cardData.items.map((log: any) => (
                          <div
                            key={log.id}
                            style={{
                              padding: '6px 8px',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              fontSize: '11px',
                              lineHeight: '1.35',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong style={{ color: '#38bdf8' }}>{log.actor?.name || 'System'}</strong>
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{new Date(log.createdAt).toLocaleTimeString()}</span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {log.action} • {log.resource}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ==================================================== */}
                    {/* RICH CARD RENDERER: PRODUCT VELOCITY REPORT */}
                    {/* ==================================================== */}
                    {m.cardData && m.cardData.type === 'product_velocity' && m.cardData.stats && (() => {
                      const stats = m.cardData.stats;
                      const product = stats.product;
                      return (
                        <div
                          style={{
                            marginTop: '12px',
                            background: 'var(--bg-elevated)',
                            border: '1.5px solid rgba(56, 189, 248, 0.35)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                              {product.name}
                            </strong>
                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              {product.sku}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '11.5px', backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '8px', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Current Stock:</span>
                              <strong style={{ color: stats.reorderRecommended ? '#ef4444' : '#22c55e' }}>{product.currentStock} units</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Minimum Stock:</span>
                              <strong>{product.minimumStock} units</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>30-Day Dispatched:</span>
                              <strong>{stats.totalDispatched} units</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Sales Velocity:</span>
                              <strong>{stats.dailyVelocity.toFixed(2)} units/day</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '5px', marginTop: '3px' }}>
                              <span style={{ color: 'var(--text-secondary)' }}>Days to Stockout:</span>
                              <strong style={{ color: stats.daysToStockout && stats.daysToStockout < 10 ? '#ef4444' : 'var(--text-primary)' }}>
                                {stats.daysToStockout ? `${stats.daysToStockout} days` : 'Infinite / Stable'}
                              </strong>
                            </div>
                          </div>
                          {stats.reorderRecommended && (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button
                                onClick={() => void handleSend(`Inward 50 stock for ${product.name}`)}
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: '#ffffff', borderRadius: '5px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 700, cursor: 'pointer' }}
                              >
                                📥 Inward Restock (50x)
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Contextual Suggested Prompt Chips - Only render on the most recent AI message to keep transcript clean */}
                  {m.suggestedPrompts &&
                    m.suggestedPrompts.length > 0 &&
                    isAi &&
                    idx === lastAiIndex &&
                    !isTyping && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '5px',
                          marginTop: '8px',
                          paddingLeft: '2px',
                        }}
                      >
                        {m.suggestedPrompts.map((p) => {
                          const cleanPrompt = p.replace(/^[⚡🧠]\s*/, '').replace(/\uFFFD/g, '').trim();
                          const isInsight =
                            p.startsWith('🧠') || (!p.startsWith('⚡') && classifyPromptIntent(cleanPrompt) === 'insight');
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleLoadPromptForEdit(cleanPrompt)}
                              title={`Load "${cleanPrompt}" to edit`}
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                padding: '3px 9px',
                                borderRadius: '6px',
                                backgroundColor: isInsight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(59, 130, 246, 0.08)',
                                color: isInsight ? '#c4b5fd' : '#93c5fd',
                                border: `1px solid ${isInsight ? 'rgba(124, 58, 237, 0.25)' : 'rgba(59, 130, 246, 0.25)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.borderColor = isInsight ? '#a78bfa' : '#60a5fa';
                                e.currentTarget.style.backgroundColor = isInsight ? 'rgba(124, 58, 237, 0.25)' : 'rgba(59, 130, 246, 0.25)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = isInsight ? '#c4b5fd' : '#93c5fd';
                                e.currentTarget.style.borderColor = isInsight ? 'rgba(124, 58, 237, 0.25)' : 'rgba(59, 130, 246, 0.25)';
                                e.currentTarget.style.backgroundColor = isInsight ? 'rgba(124, 58, 237, 0.08)' : 'rgba(59, 130, 246, 0.08)';
                              }}
                            >
                              <span>{isInsight ? '🧠' : '⚡'}</span>
                              <span>{cleanPrompt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                  {/* Message Toolbar: Timestamp, Copy Button & Thumbs Up / Down Feedback */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '5px',
                      padding: '0 4px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {m.timestamp}
                    </span>

                    {!isAi && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--border-color)' }}>•</span>
                        <button
                          type="button"
                          onClick={() => handleLoadPromptForEdit(m.text)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#c084fc';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-tertiary)';
                          }}
                          title="Edit this query in input bar"
                        >
                          <IconEdit size={10} />
                          <span>Edit</span>
                        </button>
                      </>
                    )}

                    {isAi && !m.isStreaming && (
                      <>
                        <span style={{ fontSize: '10px', color: 'var(--border-color)' }}>•</span>

                        {/* Copy Response Button */}
                        <button
                          type="button"
                          onClick={() => void handleCopyResponse(m.id, m.text)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            color: copiedMsgId === m.id ? '#10b981' : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            transition: 'all 0.15s ease',
                          }}
                          title="Copy response to clipboard"
                        >
                          {copiedMsgId === m.id ? (
                            <>
                              <IconCheck size={11} />
                              <span style={{ color: '#10b981' }}>Copied!</span>
                            </>
                          ) : (
                            <>
                              <IconCopy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {/* Thumbs Up (Helpful) */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, 'like')}
                          style={{
                            background: m.feedback === 'like' ? 'rgba(16, 185, 129, 0.15)' : 'none',
                            border: m.feedback === 'like' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            color: m.feedback === 'like' ? '#10b981' : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '10px',
                            transition: 'all 0.15s ease',
                          }}
                          title={m.feedback === 'like' ? 'Helpful (selected)' : 'Good response'}
                        >
                          <IconThumbUp size={11} />
                        </button>

                        {/* Thumbs Down (Not Helpful) */}
                        <button
                          type="button"
                          onClick={() => handleFeedback(m.id, 'dislike')}
                          style={{
                            background: m.feedback === 'dislike' ? 'rgba(239, 68, 68, 0.15)' : 'none',
                            border: m.feedback === 'dislike' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            color: m.feedback === 'dislike' ? '#ef4444' : 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontSize: '10px',
                            transition: 'all 0.15s ease',
                          }}
                          title={m.feedback === 'dislike' ? 'Not helpful (selected)' : 'Poor response'}
                        >
                          <IconThumbDown size={11} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            });
          })()}

        {isTyping && executingType === 'action' && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '4px 14px 14px 14px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              className="spinner"
              style={{ width: '12px', height: '12px', borderWidth: '2px' }}
            ></div>
            ⚡ DOST is preparing action & querying live records...
          </div>
        )}

        {isTyping && executingType === 'insight' && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '10px 14px',
              borderRadius: '4px 14px 14px 14px',
              backgroundColor: 'rgba(124, 58, 237, 0.08)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              color: '#a78bfa',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              className="spinner"
              style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: '#a78bfa transparent transparent transparent' }}
            ></div>
            🧠 DOST is reasoning through your data...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        style={{
          padding: '12px 14px',
          backgroundColor: 'var(--bg-tertiary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask DOST to execute an action or analyse your data..."
          className="search-input"
          style={{
            flex: 1,
            fontSize: '13px',
            padding: '9px 12px',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            transition: 'border-color 0.2s ease',
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="btn btn-primary"
          style={{
            padding: '9px 14px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconSend size={15} />
        </button>
      </form>
        </div >
      )}
    </>
  );
};

export default AiAssistantChatbot;
