import React, { useState } from 'react';
import type { RazorpayOrderData } from '../../services/payment.service';
import { IconShield, IconCheck, IconIndianRupee } from './Icons';

export interface RazorpayModalProps {
  isOpen: boolean;
  orderData: RazorpayOrderData | null;
  onClose: () => void;
  onSuccess: (paymentResult: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  orderData,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'UPI' | 'CARD' | 'NETBANKING' | 'WALLET'>('UPI');
  const [upiId, setUpiId] = useState('enterprise@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('•••');
  const [selectedBank, setSelectedBank] = useState('HDFC');
  const [processingState, setProcessingState] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');

  if (!isOpen || !orderData) return null;

  const isTrial = orderData.isTrial || orderData.amountInPaise === 0;
  const displayAmount = isTrial ? '₹0.00' : `₹${(orderData.amountInPaise / 100).toLocaleString('en-IN')}`;

  const handlePayNow = () => {
    setProcessingState('PROCESSING');
    setTimeout(() => {
      setProcessingState('SUCCESS');
      setTimeout(() => {
        const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 11)}`;
        const mockSignature = `demo_sig_${mockPaymentId}`;

        onSuccess({
          razorpay_order_id: orderData.orderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
        });
        setProcessingState('IDLE');
      }, 700);
    }, 1200);
  };

  return (
    <div className="rzp-backdrop">
      <div className="rzp-container">
        {/* Razorpay Authentic Header */}
        <div className="rzp-header">
          <div className="rzp-merchant-info">
            <div className="rzp-logo-badge">
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#0c6ff9' }}>S</span>
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                StockPulse Enterprise
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e0' }}>
                {orderData.plan.name} • {isTrial ? '14-Day Free Trial' : `${orderData.billingCycle.toLowerCase()} plan`}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="rzp-amount-badge">
              <div className="rzp-amount-value">{displayAmount}</div>
              {isTrial && (
                <div style={{ fontSize: '11px', color: '#68d391', fontWeight: 600 }}>
                  ₹0 Today • Autopay
                </div>
              )}
            </div>
            <button
              type="button"
              className="rzp-close-btn"
              onClick={onClose}
              aria-label="Close Razorpay checkout"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Razorpay 2-Pane Body */}
        <div className="rzp-body">
          {/* Left Navigation Sidebar */}
          <div className="rzp-sidebar">
            <ul className="rzp-nav-list">
              <li
                className={`rzp-nav-item ${activeTab === 'UPI' ? 'active' : ''}`}
                onClick={() => setActiveTab('UPI')}
              >
                <span>⚡ UPI / QR</span>
              </li>
              <li
                className={`rzp-nav-item ${activeTab === 'CARD' ? 'active' : ''}`}
                onClick={() => setActiveTab('CARD')}
              >
                <span>💳 Card</span>
              </li>
              <li
                className={`rzp-nav-item ${activeTab === 'NETBANKING' ? 'active' : ''}`}
                onClick={() => setActiveTab('NETBANKING')}
              >
                <span>🏦 Netbanking</span>
              </li>
              <li
                className={`rzp-nav-item ${activeTab === 'WALLET' ? 'active' : ''}`}
                onClick={() => setActiveTab('WALLET')}
              >
                <span>👛 Wallet</span>
              </li>
            </ul>

            <div className="rzp-secured-by">
              <IconShield size={14} className="color-primary" />
              <span>Secured by <strong>Razorpay</strong></span>
            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="rzp-main-content">
            {processingState === 'PROCESSING' && (
              <div style={{ padding: '60px 20px', textAlign: 'center', margin: 'auto' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚡</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a202c', marginBottom: '8px' }}>
                  Connecting to Razorpay Gateway...
                </div>
                <div style={{ fontSize: '13px', color: '#718096' }}>
                  {isTrial
                    ? 'Setting up secure e-Mandate autopay token...'
                    : 'Processing 256-bit bank authorization...'}
                </div>
              </div>
            )}

            {processingState === 'SUCCESS' && (
              <div style={{ padding: '60px 20px', textAlign: 'center', margin: 'auto' }}>
                <div style={{ fontSize: '40px', color: '#38a169', marginBottom: '16px' }}>✓</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#22543d', marginBottom: '8px' }}>
                  Payment Authorized!
                </div>
                <div style={{ fontSize: '13px', color: '#718096' }}>
                  Activating your StockPulse subscription...
                </div>
              </div>
            )}

            {processingState === 'IDLE' && (
              <>
                <div>
                  {/* UPI Tab */}
                  {activeTab === 'UPI' && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' }}>
                        Scan QR Code with any UPI App
                      </div>

                      <div className="rzp-qr-wrapper" style={{ marginBottom: '16px' }}>
                        {/* Realistic Mock QR Graphic */}
                        <div
                          style={{
                            width: '90px',
                            height: '90px',
                            background: '#1a202c',
                            borderRadius: '6px',
                            padding: '6px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '3px',
                            flexShrink: 0,
                          }}
                        >
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#3182ce', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#1a202c', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#38a169', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                          <div style={{ background: '#fff', borderRadius: '2px' }} />
                        </div>

                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2b6cb0', marginBottom: '4px' }}>
                            GPay • PhonePe • Paytm • BHIM
                          </div>
                          <div style={{ fontSize: '11px', color: '#718096' }}>
                            Scan and authorize via your preferred mobile banking app.
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#718096', marginBottom: '6px' }}>
                        OR ENTER UPI ID / VPA
                      </div>
                      <input
                        type="text"
                        className="rzp-input-field"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@upi"
                        style={{ fontFamily: 'monospace' }}
                      />
                    </div>
                  )}

                  {/* Card Tab */}
                  {activeTab === 'CARD' && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' }}>
                        Enter Card Details
                      </div>

                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>
                          CARD NUMBER
                        </div>
                        <input
                          type="text"
                          className="rzp-input-field"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>
                            EXPIRY
                          </div>
                          <input
                            type="text"
                            className="rzp-input-field"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#718096', marginBottom: '4px' }}>
                            CVV
                          </div>
                          <input
                            type="password"
                            className="rzp-input-field"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            style={{ fontFamily: 'monospace' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Netbanking Tab */}
                  {activeTab === 'NETBANKING' && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' }}>
                        Popular Indian Banks
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                        {[
                          { id: 'HDFC', name: 'HDFC Bank' },
                          { id: 'ICICI', name: 'ICICI Bank' },
                          { id: 'SBI', name: 'State Bank of India' },
                          { id: 'AXIS', name: 'Axis Bank' },
                        ].map((bank) => (
                          <button
                            key={bank.id}
                            type="button"
                            onClick={() => setSelectedBank(bank.id)}
                            style={{
                              padding: '10px',
                              border: selectedBank === bank.id ? '2px solid #0c6ff9' : '1px solid #e2e8f0',
                              background: selectedBank === bank.id ? '#ebf8ff' : '#ffffff',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: selectedBank === bank.id ? '#0c6ff9' : '#2d3748',
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {bank.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Wallet Tab */}
                  {activeTab === 'WALLET' && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748', marginBottom: '12px' }}>
                        Select Wallet
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {['Paytm Wallet', 'Amazon Pay Balance', 'PhonePe Wallet', 'MobiKwik'].map((w) => (
                          <div
                            key={w}
                            style={{
                              padding: '10px 14px',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#2d3748',
                              background: '#f7fafc',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <span>{w}</span>
                            <span style={{ fontSize: '11px', color: '#0c6ff9' }}>Link &amp; Pay →</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Trigger Button */}
                <div style={{ marginTop: '20px' }}>
                  <button type="button" className="rzp-pay-button" onClick={handlePayNow}>
                    {isTrial ? (
                      <>
                        <IconShield size={16} /> Authorize ₹0 Autopay Mandate
                      </>
                    ) : (
                      <>
                        <IconIndianRupee size={16} /> Pay {displayAmount} via Razorpay
                      </>
                    )}
                  </button>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#718096',
                      marginTop: '10px',
                    }}
                  >
                    <IconCheck size={13} className="color-success" />
                    <span>256-Bit SSL Encryption • Instant Activation</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
