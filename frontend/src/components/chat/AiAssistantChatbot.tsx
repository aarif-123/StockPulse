import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
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
  const { user, activeOrg } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const initialWelcomeMsg: ChatMessage = {
    id: 'welcome-1',
    sender: 'ai',
    text: `Hello ${user?.name || 'there'}! 👋 I am **DOST**, your intelligent StockPulse AI Business Companion.\n\nI can retrieve business data and **execute actions for you** (create challans, inward/outward stock, confirm dispatches, and manage CRM). I will always ask for your permission before modifying data. How can I help you today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedPrompts: [
      'Create a new challan',
      'Inward 50 stock for product',
      'tell me the pending chalana',
      'Show low stock products',
    ],
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
      const response = await processCopilotQuery(query, { user, activeOrg });

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
    } catch (err) {
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

  const topQuickPrompts = [
    { label: '🛠️ BOM Assemblies', prompt: 'Tell me about the bill of materials' },
    { label: '🚚 Pending Challans', prompt: 'tell me the pending chalana' },
    { label: '⚡ Create Challan', prompt: 'Create delivery challan' },
    { label: '📦 Low Stock Alert', prompt: 'Show low stock products' },
    { label: '📥 Inward Stock', prompt: 'Inward 20 stock for product' },
    { label: '💰 Valuation', prompt: 'What is our total inventory valuation?' },
    { label: '📊 Workspace Stats', prompt: 'Show workspace stats & KPIs' },
  ];

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
            ? trimmed.replace(/^[•*\-]\s*|^\d+\.\s*/, '')
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
      {/* Floating Action Trigger Button (Bottom Right - Circular Shape: Dark Obsidian & Glowing Cyan) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '58px',
            height: '58px',
            backgroundColor: 'rgba(24, 24, 27, 0.94)',
            backdropFilter: 'blur(12px)',
            color: '#38bdf8',
            border: '1.5px solid rgba(56, 189, 248, 0.65)',
            borderRadius: '50%',
            boxShadow:
              '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.35), inset 0 0 10px rgba(56, 189, 248, 0.12)',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: '13.5px',
            letterSpacing: '0.05em',
            transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
            textShadow: '0 0 8px rgba(56, 189, 248, 0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.08)';
            e.currentTarget.style.borderColor = '#38bdf8';
            e.currentTarget.style.boxShadow =
              '0 14px 36px rgba(0, 0, 0, 0.7), 0 0 28px rgba(56, 189, 248, 0.6), inset 0 0 14px rgba(56, 189, 248, 0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.65)';
            e.currentTarget.style.boxShadow =
              '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.35), inset 0 0 10px rgba(56, 189, 248, 0.12)';
          }}
          title="Open DOST AI"
        >
          <span style={{ fontWeight: 800, fontSize: '13.5px', letterSpacing: '0.05em' }}>DOST</span>
        </button>
      )}

      {/* Floating Chatbot Window */}
      {isOpen && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: isExpanded ? '540px' : '440px',
            maxWidth: 'calc(100vw - 32px)',
            height: isExpanded ? '720px' : '620px',
            maxHeight: 'calc(100vh - 48px)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(124, 58, 237, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000,
            transition: 'width 0.25s ease, height 0.25s ease',
            animation: 'slideUpFade 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), #a78bfa)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '15px',
                  boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
                }}
              >
                ✨
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
                  DOST
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'var(--primary-light)',
                      color: 'var(--primary-hover)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    AI Action Companion
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--success)',
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
                      background: 'var(--success)',
                    }}
                  ></span>
                  Online • {activeOrg?.organizationName || 'Live Workspace'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title={isExpanded ? 'Standard view' : 'Expanded view'}
              >
                <IconBarChart size={15} />
              </button>
              <button
                onClick={handleClearChat}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title="Clear conversation"
              >
                <IconTrash size={15} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="btn-icon"
                style={{ color: 'var(--text-secondary)', padding: '6px' }}
                title="Minimize"
              >
                <IconMinimize size={15} />
              </button>
              <button
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
                      backgroundColor: isAi ? 'var(--bg-tertiary)' : 'var(--primary)',
                      color: isAi ? 'var(--text-primary)' : '#ffffff',
                      border: isAi ? '1px solid var(--border-color)' : 'none',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
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
                              color: m.action.isSerious ? '#ef4444' : '#8b5cf6',
                              backgroundColor: m.action.isSerious
                                ? 'rgba(239, 68, 68, 0.18)'
                                : 'rgba(139, 92, 246, 0.18)',
                              border: m.action.isSerious
                                ? '1px solid rgba(239, 68, 68, 0.35)'
                                : '1px solid rgba(139, 92, 246, 0.35)',
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
                                              value: `${moveType} (${
                                                moveType === 'IN'
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
                                    cust.status === 'ACTIVE' ? 'var(--success)' : '#a855f7',
                                  backgroundColor:
                                    cust.status === 'ACTIVE'
                                      ? 'rgba(34, 197, 94, 0.15)'
                                      : 'rgba(168, 85, 247, 0.15)',
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
                  </div>

                  {/* Contextual Suggested Prompt Chips */}
                  {m.suggestedPrompts && m.suggestedPrompts.length > 0 && isAi && (
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
                  )}

                  <span
                    style={{
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
          </form>
        </div>
      )}
    </>
  );
};

export default AiAssistantChatbot;
