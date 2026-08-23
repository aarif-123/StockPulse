import React, { useState, useEffect, useRef } from 'react';
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
  IconSparkles,
} from '../common/Icons';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  cardData?: CopilotCardData;
  action?: CopilotActionPayload;
  suggestedPrompts?: string[];
}

export const AiAssistantChatbot: React.FC = () => {
  const { user, activeOrg, isSuperAdmin, startSupportSession } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Floatable & Draggable Trigger Button State
  const TRIGGER_WIDTH = 150;
  const TRIGGER_HEIGHT = 52;
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
    const orgName = activeOrg?.organizationName || 'StockPulse Workspace';
    const lowStockAlert = liveStats?.lowStockCount ? `⚠️ **${liveStats.lowStockCount} Low Stock Item(s)**` : '';
    const draftAlert = liveStats?.draftChallans ? `🚚 **${liveStats.draftChallans} Draft Challan(s) Pending**` : '';
    const alertSummary = [lowStockAlert, draftAlert].filter(Boolean).join(' and ');

    let welcomeText = `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your AI Business Companion for **${orgName}**.\n\nActive Role: **[${role}]**\n${alertSummary ? `Live Alerts: ${alertSummary} require your attention.\n` : ''}\nI can retrieve live business data and **execute actions for you** (create challans, inward/outward stock, confirm dispatches, and manage CRM). I will always ask for your explicit approval before modifying data. What would you like to do?`;
    let welcomePrompts = [
      'Create a new challan',
      'Inward 50 stock for product',
      'tell me the pending chalana',
      'Show low stock products',
    ];

    if (isSuperAdmin) {
      welcomeText = `Hello Admin ${user?.name || ''}! 👑 I am **DOST**, your Global SaaS Platform Assistant.\n\nI can retrieve system metrics, evaluate database latency/health, review manual UPI payments, toggle tenant status (Suspend/Activate), and start impersonation support sessions. How can I assist you with platform operations today?`;
      welcomePrompts = [
        'Show platform overview metrics',
        'Show system health telemetry',
        'List tenant organizations',
        'Show pending payments',
      ];
    } else {
      if (role === 'SALES') {
        welcomeText = `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your Sales AI Companion for **${orgName}**.\n\nActive Scope: **[SALES]**\n${alertSummary ? `Live Workspace Status: ${alertSummary}.\n` : ''}\nI can help you search products, view customer CRM leads, create delivery challans, and check dispatch statuses. How can I help you close deals today?`;
        welcomePrompts = [
          'Create a new challan',
          'Show customer leads',
          'Show active customers',
          'Show recent delivery challans',
        ];
      } else if (role === 'WAREHOUSE') {
        welcomeText = `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your Warehouse Operations Companion for **${orgName}**.\n\nActive Scope: **[WAREHOUSE]**\n${alertSummary ? `Live Warehouse Status: ${alertSummary}.\n` : ''}\nI can help you process inward/outward stock, confirm delivery challans, assemble BOM builds, and monitor low stock items. How can I assist with your shipments today?`;
        welcomePrompts = [
          'Inward 50 stock for product',
          'tell me the pending chalana',
          'Show low stock products',
          'Show Bill of Materials',
        ];
      } else if (role === 'ACCOUNTS') {
        welcomeText = `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your Financial & Inventory Accounts Companion for **${orgName}**.\n\nActive Scope: **[ACCOUNTS]**\nI can help you audit stock movement logs, check total inventory asset valuations, and inspect dashboard KPIs. How can I assist with accounting & auditing today?`;
        welcomePrompts = [
          'What is our total inventory valuation?',
          'Recent stock movements',
          'Show workspace stats & KPIs',
        ];
      } else if (role === 'ORG_ADMIN' || role === 'ADMIN') {
        welcomeText = `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your Organization Admin AI Companion for **${orgName}**.\n\nActive Scope: **[ORG_ADMIN]**\n${alertSummary ? `Live Organization Status: ${alertSummary}.\n` : ''}\nI have full authority to execute stock movements, issue challans, manage CRM clients, assemble BOM builds, and audit notification logs. What is your directive?`;
        welcomePrompts = [
          'Show workspace stats & KPIs',
          'Create a new challan',
          'Inward 50 stock for product',
          'What is our total inventory valuation?',
        ];
      }
    }

    return { text: welcomeText, prompts: welcomePrompts };
  };

  const welcomeConfig = getWelcomeConfig();

  const initialWelcomeMsg: ChatMessage = {
    id: 'welcome-1',
    sender: 'ai',
    text: welcomeConfig.text,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedPrompts: welcomeConfig.prompts,
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcomeMsg]);
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

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsTyping(true);

    try {
      const response = await processCopilotQuery(query, { user, activeOrg, isSuperAdmin });

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
          text: `⚠️ I encountered an error fetching live data. Please ensure your session is active and check network connectivity.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedPrompts: ['Show workspace stats & KPIs', 'tell me the pending chalana'],
        },
      ]);
    } finally {
      setIsTyping(false);
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
    setMessages([initialWelcomeMsg]);
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

  // High-Quality Clean UI Markdown & Component Renderer
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {lines.map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={i} style={{ height: '2px' }} />;
          }

          const isBullet =
            trimmed.startsWith('•') ||
            trimmed.startsWith('* ') ||
            trimmed.startsWith('- ') ||
            /^\d+\.\s/.test(trimmed);

          const cleanLine = isBullet
            ? trimmed.replace(/^[•*-]\s*|^\d+\.\s*/, '')
            : trimmed;

          // Strip wrapping quotes and format bold/italic/key highlights
          const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              const inner = part.slice(1, -1).replace(/^["']|["']$/g, '');
              return (
                <span
                  key={pIdx}
                  style={{
                    color: '#38bdf8',
                    fontWeight: 600,
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                    padding: '1px 5px',
                    borderRadius: '4px',
                  }}
                >
                  {inner}
                </span>
              );
            }
            return part;
          });

          if (isBullet) {
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '6px 10px',
                  backgroundColor: 'rgba(255, 255, 255, 0.035)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  lineHeight: '1.4',
                }}
              >
                <span
                  style={{
                    color: '#38bdf8',
                    fontSize: '13px',
                    fontWeight: 800,
                    lineHeight: '1',
                    marginTop: '2px',
                  }}
                >
                  ›
                </span>
                <div style={{ flex: 1 }}>{formattedLine}</div>
              </div>
            );
          }

          return (
            <div key={i} style={{ lineHeight: '1.45', fontSize: '13px' }}>
              {formattedLine}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
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
            borderColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.65)' : undefined,
            boxShadow: isSuperAdmin ? '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(245, 158, 11, 0.35), inset 0 0 10px rgba(245, 158, 11, 0.12)' : undefined,
          }}
          title="DOST AI Assistant • Drag anywhere to reposition • Click to chat • Double-click to reset"
          aria-label="Open DOST AI Business Companion"
        >
          {/* Visual Drag Grip Handle */}
          <div className="dost-float-grip" aria-hidden="true" title="Drag to reposition">
            <div className="dost-float-grip-row">
              <div className="dost-float-grip-dot" />
              <div className="dost-float-grip-dot" />
            </div>
            <div className="dost-float-grip-row">
              <div className="dost-float-grip-dot" />
              <div className="dost-float-grip-dot" />
            </div>
            <div className="dost-float-grip-row">
              <div className="dost-float-grip-dot" />
              <div className="dost-float-grip-dot" />
            </div>
          </div>

          {/* AI Orb with Animated Beacon Pulse */}
          <div className="dost-float-orb" style={{ background: isSuperAdmin ? 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)' : undefined, boxShadow: isSuperAdmin ? '0 2px 10px rgba(245, 158, 11, 0.4)' : undefined }}>
            <div className="dost-float-pulse-ring" style={{ borderColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.75)' : undefined }} />
            <IconSparkles size={18} />
          </div>

          {/* Label and Status */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span
                style={{
                  fontWeight: 900,
                  fontSize: '13.5px',
                  letterSpacing: '0.06em',
                  color: '#ffffff',
                  textShadow: isSuperAdmin ? '0 0 10px rgba(245, 158, 11, 0.6)' : '0 0 10px rgba(56, 189, 248, 0.6)',
                }}
              >
                {isSuperAdmin ? 'DOST 👑' : 'DOST'}
              </span>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 800,
                  backgroundColor: isSuperAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color: isSuperAdmin ? '#fbbf24' : '#38bdf8',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  border: isSuperAdmin ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                  letterSpacing: '0.04em',
                }}
              >
                AI
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                color: isSuperAdmin ? '#fbbf24' : '#4ade80',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: isSuperAdmin ? '#fbbf24' : '#4ade80',
                  boxShadow: isSuperAdmin ? '0 0 6px #fbbf24' : '0 0 6px #4ade80',
                }}
              />
              {isSuperAdmin ? 'Platform Admin' : 'Online'}
            </span>
          </div>
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
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: isSuperAdmin ? 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)' : 'linear-gradient(135deg, #ffffff, #a3a3a3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSuperAdmin ? '#ffffff' : '#000000',
                  fontWeight: 800,
                  fontSize: '15px',
                  boxShadow: isSuperAdmin ? '0 2px 8px rgba(245, 158, 11, 0.45)' : '0 2px 8px rgba(0, 0, 0, 0.4)',
                }}
              >
                <IconSparkles size={18} />
              </div>
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
                      background: isSuperAdmin ? 'rgba(245, 158, 11, 0.15)' : 'var(--primary-light)',
                      color: isSuperAdmin ? '#fbbf24' : 'var(--primary-hover)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {isSuperAdmin ? 'Global SaaS Platform' : 'AI Action Companion'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: isSuperAdmin ? '#fbbf24' : 'var(--success)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isSuperAdmin ? '#fbbf24' : 'var(--success)',
                    }}
                  ></span>
                  {isSuperAdmin ? 'SaaS System Control Mode' : `Online • ${activeOrg?.organizationName || 'Live Workspace'}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setWindowPos(null)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
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
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title={isExpanded ? 'Standard view' : 'Expanded view'}
              >
                <IconBarChart size={15} />
              </button>
              <button
                type="button"
                onClick={handleClearChat}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title="Clear conversation"
              >
                <IconTrash size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title="Minimize"
              >
                <IconMinimize size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title="Close"
              >
                <IconX size={15} />
              </button>
            </div>
          </div>

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
                onClick={() => void handleSend(q.prompt)}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 9px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.backgroundColor = 'var(--primary-light)';
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
            {messages.map((m) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                    maxWidth: isAi ? '98%' : '88%',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: isAi ? '4px 14px 14px 14px' : '14px 14px 4px 14px',
                      backgroundColor: isAi ? 'var(--bg-tertiary)' : '#ffffff',
                      color: isAi ? 'var(--text-primary)' : '#09090b',
                      fontWeight: isAi ? 400 : 600,
                      border: isAi ? '1px solid var(--border-color)' : 'none',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      boxShadow: isAi
                        ? '0 2px 8px rgba(0, 0, 0, 0.1)'
                        : '0 2px 12px rgba(255, 255, 255, 0.15)',
                      width: '100%',
                    }}
                  >
                    {renderFormattedText(m.text)}

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

                  {/* Contextual Suggested Prompt Chips */ }
                  {
                m.suggestedPrompts && m.suggestedPrompts.length > 0 && isAi && (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '5px',
                      marginTop: '8px',
                      paddingLeft: '2px',
                    }}
                  >
                    {m.suggestedPrompts.map((p) => (
                      <button
                        key={p}
                        onClick={() => void handleSend(p)}
                        style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(255, 255, 255, 0.04)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.borderColor = 'var(--primary)';
                          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                        }}
                      >
                        ⚡ {p}
                      </button>
                    ))}
                  </div>
                )
              }

              < span
                    style = {{
              fontSize: '10px',
              color: 'var(--text-tertiary)',
              marginTop: '4px',
              padding: '0 4px',
            }}
                  >
            {m.timestamp}
          </span>
        </div>
      );
            })}

      {isTyping && (
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
          DOST is preparing action and querying live records...
        </div>
      )}

      <div ref={messagesEndRef} />
    </div >

      {/* Input Bar */ }
      < form
  onSubmit = {(e) => {
  e.preventDefault();
  void handleSend();
}}
style = {{
  padding: '12px 14px',
    backgroundColor: 'var(--bg-tertiary)',
      borderTop: '1px solid var(--border-color)',
        display: 'flex',
          gap: '8px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Give DOST an action (e.g. 'Create challan for Apex' or 'Inward 20 stock')..."
              className="search-input"
              style={{
                flex: 1,
                fontSize: '13px',
                padding: '9px 12px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
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
          </form >
        </div >
      )}
    </>
  );
};

export default AiAssistantChatbot;
