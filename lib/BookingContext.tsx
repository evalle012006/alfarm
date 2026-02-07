'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type BookingType = 'day' | 'overnight';

export interface BookingCartItem {
  product_id: number;
  quantity: number;
}

export interface BookingGuestInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  adults: number;
  children: number;
}

export type DemoPaymentMethod = 'cash' | 'gcash' | 'paymaya';

export interface BookingState {
  bookingType: BookingType;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  cart: Record<number, number>;
  guestInfo: BookingGuestInfo | null;
  specialRequests: string;
  paymentMethod: DemoPaymentMethod;
  lastBookingId: number | null;
  lastBookingTotalAmount: number | null;
}

const STORAGE_KEY = 'booking_flow_state_v1';

const defaultState: BookingState = {
  bookingType: 'day',
  checkInDate: '',
  checkOutDate: '',
  adults: 2,
  children: 0,
  cart: {},
  guestInfo: null,
  specialRequests: '',
  paymentMethod: 'cash',
  lastBookingId: null,
  lastBookingTotalAmount: null,
};

interface BookingContextValue {
  state: BookingState;
  setSearch: (input: { bookingType: BookingType; checkInDate: string; checkOutDate?: string; adults: number; children: number }) => void;
  setCartQuantity: (productId: number, quantity: number) => void;
  incrementCart: (productId: number, delta: number) => void;
  clearCart: () => void;
  setGuestInfo: (info: BookingGuestInfo) => void;
  setSpecialRequests: (value: string) => void;
  setPaymentMethod: (value: DemoPaymentMethod) => void;
  setConfirmation: (input: { bookingId: number; totalAmount: number }) => void;
  reset: (options?: { keepSearch?: boolean }) => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

function readFromStorage(): BookingState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<BookingState>;
    return {
      ...defaultState,
      ...parsed,
      cart: parsed.cart ?? defaultState.cart,
      guestInfo: parsed.guestInfo ?? defaultState.guestInfo,
    };
  } catch {
    return defaultState;
  }
}

function writeToStorage(state: BookingState) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BookingState>(() => readFromStorage());

  useEffect(() => {
    writeToStorage(state);
  }, [state]);

  const value = useMemo<BookingContextValue>(() => {
    return {
      state,
      setSearch: ({ bookingType, checkInDate, checkOutDate, adults, children }) => {
        setState((prev) => ({
          ...prev,
          bookingType,
          checkInDate,
          checkOutDate: bookingType === 'overnight' ? (checkOutDate || prev.checkOutDate || '') : '',
          adults,
          children,
        }));
      },
      setCartQuantity: (productId, quantity) => {
        setState((prev) => {
          const nextQty = Math.max(0, Math.floor(quantity));
          const nextCart = { ...prev.cart };
          if (nextQty === 0) delete nextCart[productId];
          else nextCart[productId] = nextQty;
          return { ...prev, cart: nextCart };
        });
      },
      incrementCart: (productId, delta) => {
        setState((prev) => {
          const current = prev.cart[productId] || 0;
          const nextQty = Math.max(0, current + delta);
          const nextCart = { ...prev.cart };
          if (nextQty === 0) delete nextCart[productId];
          else nextCart[productId] = nextQty;
          return { ...prev, cart: nextCart };
        });
      },
      clearCart: () => {
        setState((prev) => ({ ...prev, cart: {} }));
      },
      setGuestInfo: (info) => {
        setState((prev) => ({ ...prev, guestInfo: info }));
      },
      setSpecialRequests: (value) => {
        setState((prev) => ({ ...prev, specialRequests: value }));
      },
      setPaymentMethod: (value) => {
        setState((prev) => ({ ...prev, paymentMethod: value }));
      },
      setConfirmation: ({ bookingId, totalAmount }) => {
        setState((prev) => ({ ...prev, lastBookingId: bookingId, lastBookingTotalAmount: totalAmount }));
      },
      reset: (options) => {
        setState((prev) => {
          const keepSearch = options?.keepSearch;
          if (keepSearch) {
            return {
              ...defaultState,
              bookingType: prev.bookingType,
              checkInDate: prev.checkInDate,
              checkOutDate: prev.checkOutDate,
              adults: prev.adults,
              children: prev.children,
            };
          }
          return defaultState;
        });
      },
    };
  }, [state]);

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return ctx;
}

export function getBookingCartItems(cart: Record<number, number>): BookingCartItem[] {
  return Object.entries(cart)
    .map(([id, qty]) => ({ product_id: Number(id), quantity: Number(qty) }))
    .filter((i) => i.product_id && i.quantity > 0);
}
