import { useState, useEffect, useCallback } from 'react';
import { paymentService, type RazorpayOrderData, type SubscriptionActivationResult } from '../services/payment.service';
import { handleApiError } from '../services/api';

export interface RazorpayPaymentSuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayPaymentFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes: Record<string, string>;
  theme: {
    color: string;
  };
  handler: (response: RazorpayPaymentSuccessResponse) => void;
  modal: {
    ondismiss: () => void;
  };
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: (response: RazorpayPaymentFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export function useRazorpay() {
  const [activeOrder, setActiveOrder] = useState<RazorpayOrderData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingCallbacks, setPendingCallbacks] = useState<{
    onSuccess?: (result: SubscriptionActivationResult) => void;
    onError?: (errorMessage: string) => void;
  }>({});

  // Ensure official Razorpay script is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const initiateCheckout = useCallback(
    async (
      orderData: RazorpayOrderData,
      onSuccess: (result: SubscriptionActivationResult) => void,
      onError: (errorMessage: string) => void
    ) => {
      setLoading(true);
      setActiveOrder(orderData);
      setPendingCallbacks({ onSuccess, onError });

      const handleVerification = async (paymentResponse: RazorpayPaymentSuccessResponse) => {
        try {
          const verifyRes = await paymentService.verifyPayment({
            razorpay_order_id: paymentResponse.razorpay_order_id || orderData.orderId,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature || `sig_${paymentResponse.razorpay_payment_id}`,
            planId: orderData.plan.id,
            billingCycle: orderData.billingCycle,
            customerEmail: orderData.customer.email,
            isTrial: orderData.isTrial,
          });

          setIsModalOpen(false);
          setActiveOrder(null);
          onSuccess(verifyRes.data);
        } catch (err: unknown) {
          onError(handleApiError(err));
        } finally {
          setLoading(false);
        }
      };

      // Launch Official Razorpay SDK Popup
      if (typeof window !== 'undefined' && window.Razorpay) {
        try {
          const rzpOptions: RazorpayOptions = {
            key: orderData.keyId,
            amount: orderData.amountInPaise > 0 ? orderData.amountInPaise : 100, // 100 paise auth token for autopay
            currency: orderData.currency || 'INR',
            name: 'StockPulse Enterprise',
            description: orderData.isTrial
              ? '14-Day Free Trial (₹0 Today • Autopay Setup)'
              : `${orderData.plan.name} (${orderData.billingCycle.toLowerCase()} plan)`,
            prefill: {
              name: orderData.customer.name,
              email: orderData.customer.email,
              contact: orderData.customer.phone || '9876543210',
            },
            notes: {
              planId: orderData.plan.id,
              billingCycle: orderData.billingCycle,
              isTrial: String(Boolean(orderData.isTrial)),
              clientOrderId: orderData.orderId,
            },
            theme: {
              color: '#2563eb',
            },
            handler: (response: RazorpayPaymentSuccessResponse) => {
              void handleVerification(response);
            },
            modal: {
              ondismiss: () => {
                setLoading(false);
                onError('Razorpay checkout window was closed before completing payment.');
              },
            },
          };

          const rzp = new window.Razorpay(rzpOptions);
          rzp.on('payment.failed', (failRes: RazorpayPaymentFailureResponse) => {
            setLoading(false);
            onError(failRes.error?.description || 'Payment failed on Razorpay.');
          });

          rzp.open();
          setLoading(false);
          return;
        } catch {
          // If official SDK fails to initialize (e.g. adblocker), fallback to in-app modal
          setIsModalOpen(true);
        }
      } else {
        // Fallback to in-app modal
        setIsModalOpen(true);
      }
    },
    []
  );

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setLoading(false);
    if (pendingCallbacks.onError) {
      pendingCallbacks.onError('Payment canceled by user.');
    }
  }, [pendingCallbacks]);

  const handleModalSuccess = useCallback(
    async (paymentResult: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      if (!activeOrder) return;
      try {
        const verifyRes = await paymentService.verifyPayment({
          razorpay_order_id: paymentResult.razorpay_order_id,
          razorpay_payment_id: paymentResult.razorpay_payment_id,
          razorpay_signature: paymentResult.razorpay_signature,
          planId: activeOrder.plan.id,
          billingCycle: activeOrder.billingCycle,
          customerEmail: activeOrder.customer.email,
          isTrial: activeOrder.isTrial,
        });

        setIsModalOpen(false);
        setActiveOrder(null);
        if (pendingCallbacks.onSuccess) {
          pendingCallbacks.onSuccess(verifyRes.data);
        }
      } catch (err: unknown) {
        if (pendingCallbacks.onError) {
          pendingCallbacks.onError(handleApiError(err));
        }
      } finally {
        setLoading(false);
      }
    },
    [activeOrder, pendingCallbacks]
  );

  return {
    loading,
    activeOrder,
    isModalOpen,
    initiateCheckout,
    handleModalClose,
    handleModalSuccess,
  };
}

