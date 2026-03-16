import Stripe from 'stripe';

/**
 * Server-side Stripe SDK singleton.
 * Only import this in server components / API routes — never in client code.
 */

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn(
    'STRIPE_SECRET_KEY is not set. Stripe payment features will be unavailable.'
  );
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2026-02-25.clover',
      typescript: true,
    })
  : null;

/**
 * Helper to check if Stripe is configured before using it.
 * Throws a clear error if called when Stripe is not set up.
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      'Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.'
    );
  }
  return stripe;
}

export const STRIPE_CURRENCY = 'php';
export const STRIPE_CHECKOUT_EXPIRY_SECONDS = 1800; // 30 minutes
