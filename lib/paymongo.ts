import { createHmac } from 'crypto';

/**
 * PayMongo REST API client for server-side use.
 * Only import this in API routes — never in client code.
 *
 * API Reference: https://developers.paymongo.com/reference
 */

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY;

if (!paymongoSecretKey) {
  console.warn(
    'PAYMONGO_SECRET_KEY is not set. Online payment features will be unavailable.'
  );
}

export const PAYMONGO_CURRENCY = 'PHP';
export const PAYMONGO_CHECKOUT_EXPIRY_MINUTES = 30;

// ─── Typed interfaces ────────────────────────────────────────────────────────

export interface PayMongoLineItem {
  name: string;
  description?: string;
  amount: number; // in centavos (PHP × 100)
  currency: string;
  quantity: number;
}

export interface CreateCheckoutSessionParams {
  line_items: PayMongoLineItem[];
  payment_method_types: string[];
  description: string;
  success_url: string;
  cancel_url?: string;
  metadata?: Record<string, string>;
  send_email_receipt?: boolean;
  show_description?: boolean;
  show_line_items?: boolean;
}

export interface PayMongoCheckoutSession {
  id: string;
  type: 'checkout_session';
  attributes: {
    checkout_url: string;
    status: string;
    payments: Array<{
      id: string;
      type: 'payment';
      attributes: {
        amount: number;
        status: string;
        payment_intent_id: string;
      };
    }>;
    payment_intent: {
      id: string;
      type: 'payment_intent';
      attributes: {
        status: string;
        payments: Array<{ id: string }>;
      };
    } | null;
    metadata: Record<string, string> | null;
    [key: string]: any;
  };
}

export interface CreateRefundParams {
  amount: number; // in centavos
  payment_id: string;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'others';
  notes?: string;
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

/**
 * Authenticated fetch to PayMongo API.
 * Uses HTTP Basic Auth with secret key as username, empty password.
 */
async function paymongoFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!paymongoSecretKey) {
    throw new Error(
      'PayMongo is not configured. Set PAYMONGO_SECRET_KEY in your environment.'
    );
  }

  const authHeader = 'Basic ' + Buffer.from(paymongoSecretKey + ':').toString('base64');

  return fetch(`${PAYMONGO_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
      ...options.headers,
    },
  });
}

// ─── Checkout Sessions ───────────────────────────────────────────────────────

/**
 * Create a PayMongo Checkout Session.
 * Returns the full checkout session resource.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<PayMongoCheckoutSession> {
  const res = await paymongoFetch('/checkout_sessions', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: params.line_items,
          payment_method_types: params.payment_method_types,
          description: params.description,
          success_url: params.success_url,
          ...(params.cancel_url ? { cancel_url: params.cancel_url } : {}),
          send_email_receipt: params.send_email_receipt ?? true,
          show_description: params.show_description ?? true,
          show_line_items: params.show_line_items ?? true,
          metadata: params.metadata || {},
        },
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorMsg = errorBody?.errors?.[0]?.detail || `PayMongo API error (${res.status})`;
    throw new Error(errorMsg);
  }

  const json = await res.json();
  return json.data as PayMongoCheckoutSession;
}

/**
 * Expire a PayMongo Checkout Session by ID.
 */
export async function expireCheckoutSession(sessionId: string): Promise<void> {
  const res = await paymongoFetch(`/checkout_sessions/${sessionId}/expire`, {
    method: 'POST',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorMsg = errorBody?.errors?.[0]?.detail || `Failed to expire session (${res.status})`;
    throw new Error(errorMsg);
  }
}

/**
 * Retrieve a PayMongo Checkout Session by ID.
 */
export async function retrieveCheckoutSession(
  sessionId: string
): Promise<PayMongoCheckoutSession> {
  const res = await paymongoFetch(`/checkout_sessions/${sessionId}`, {
    method: 'GET',
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.errors?.[0]?.detail || `Failed to retrieve session (${res.status})`);
  }

  const json = await res.json();
  return json.data as PayMongoCheckoutSession;
}

// ─── Refunds ─────────────────────────────────────────────────────────────────

/**
 * Create a PayMongo Refund.
 * Returns the refund resource ID.
 */
export async function createRefund(
  params: CreateRefundParams
): Promise<{ id: string; status: string }> {
  const res = await paymongoFetch('/refunds', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          amount: params.amount,
          payment_id: params.payment_id,
          reason: params.reason,
          notes: params.notes,
        },
      },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const errorMsg = errorBody?.errors?.[0]?.detail || `PayMongo refund failed (${res.status})`;
    throw new Error(errorMsg);
  }

  const json = await res.json();
  return {
    id: json.data.id,
    status: json.data.attributes.status,
  };
}

// ─── Webhook Verification ────────────────────────────────────────────────────

/**
 * Verify a PayMongo webhook signature.
 *
 * PayMongo sends a `Paymongo-Signature` header:
 *   t=<timestamp>,te=<test_signature>,li=<live_signature>
 *
 * Verification:
 *   1. Parse header for t, te, li
 *   2. Concatenate: `${t}.${rawBody}`
 *   3. HMAC-SHA256 with webhook secret
 *   4. Compare with `te` (test) or `li` (live)
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const [key, ...valueParts] = segment.split('=');
    parts[key.trim()] = valueParts.join('=').trim();
  }

  const timestamp = parts['t'];
  if (!timestamp) return false;

  const signatureString = `${timestamp}.${rawBody}`;
  const computedHmac = createHmac('sha256', secret)
    .update(signatureString)
    .digest('hex');

  // Compare against test mode or live mode signature
  const testSig = parts['te'] || '';
  const liveSig = parts['li'] || '';

  return computedHmac === testSig || computedHmac === liveSig;
}

/**
 * Check if PayMongo is configured (secret key is set).
 */
export function isPayMongoConfigured(): boolean {
  return !!paymongoSecretKey;
}
