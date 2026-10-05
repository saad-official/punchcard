import type { Plan } from '@punchcard/shared';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { createStore } from '@/data/store';

/** RevenueCat entitlement that unlocks Pro (spec section 6). */
export const PRO_ENTITLEMENT = 'pro';

const PLAN_CACHE_KEY = 'punchcard.plan';

// EXPO_PUBLIC_* values are inlined at build time from .env / EAS env.
const TEST_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_KEY;
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;

/**
 * Test Store keys only work in debug builds: RevenueCat crashes a release build that is
 * configured with one. Release builds therefore need a platform key; until the stores are
 * live they run without purchases (plan stays at the cached value / free).
 */
function resolveApiKey(): string | null {
  const platformKey = Platform.OS === 'ios' ? IOS_KEY : Platform.OS === 'android' ? ANDROID_KEY : undefined;
  if (__DEV__) return TEST_KEY || platformKey || null;
  return platformKey || null;
}

function readCachedPlan(): Plan {
  try {
    return SecureStore.getItem(PLAN_CACHE_KEY) === 'pro' ? 'pro' : 'free';
  } catch {
    return 'free';
  }
}

const planStore = createStore<Plan>(Platform.OS === 'web' ? 'free' : readCachedPlan());
const configuredStore = createStore(false);

function applyCustomerInfo(info: CustomerInfo): Plan {
  const plan: Plan = info.entitlements.active[PRO_ENTITLEMENT] ? 'pro' : 'free';
  planStore.setState(plan);
  SecureStore.setItemAsync(PLAN_CACHE_KEY, plan).catch(() => undefined);
  return plan;
}

let initPromise: Promise<boolean> | null = null;

/**
 * Configure RevenueCat once. Resolves `false` (and logs a warning) when no usable key is
 * set, in which case every other function here is a safe no-op.
 */
export function initPurchases(appUserId?: string | null): Promise<boolean> {
  if (!initPromise) {
    initPromise = (async () => {
      if (Platform.OS === 'web') return false;
      const apiKey = resolveApiKey();
      if (!apiKey) {
        console.warn(
          '[purchases] No RevenueCat key (EXPO_PUBLIC_REVENUECAT_TEST_KEY in dev, platform keys in release); purchases disabled.',
        );
        return false;
      }
      if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.WARN);
      Purchases.configure({ apiKey, appUserID: appUserId ?? null });
      Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
      configuredStore.setState(true);
      try {
        applyCustomerInfo(await Purchases.getCustomerInfo());
      } catch {
        // offline: keep the cached plan
      }
      return true;
    })().catch((error) => {
      console.warn('[purchases] init failed', error);
      initPromise = null;
      return false;
    });
  }
  return initPromise;
}

/** `'free' | 'pro'` from the `pro` entitlement; starts from the SecureStore cache so it works offline. */
export function usePlan(): Plan {
  useEffect(() => {
    initPurchases().catch(() => undefined);
  }, []);
  return useSyncExternalStore(planStore.subscribe, planStore.getSnapshot);
}

/** Non-hook read (e.g. inside handlers and background tasks). */
export function getPlan(): Plan {
  return planStore.getSnapshot();
}

export function usePurchasesAvailable(): boolean {
  return useSyncExternalStore(configuredStore.subscribe, configuredStore.getSnapshot);
}

export type PaywallOutcome = 'purchased' | 'restored' | 'cancelled' | 'not-presented' | 'unavailable' | 'error';

/** Presents the RevenueCat paywall for the current offering. */
export async function presentPaywall(): Promise<PaywallOutcome> {
  if (!(await initPurchases())) return 'unavailable';
  try {
    const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
    switch (result) {
      case PAYWALL_RESULT.PURCHASED:
      case PAYWALL_RESULT.RESTORED:
        applyCustomerInfo(await Purchases.getCustomerInfo());
        return result === PAYWALL_RESULT.PURCHASED ? 'purchased' : 'restored';
      case PAYWALL_RESULT.CANCELLED:
        return 'cancelled';
      case PAYWALL_RESULT.NOT_PRESENTED:
        return 'not-presented';
      default:
        return 'error';
    }
  } catch (error) {
    console.warn('[purchases] paywall failed', error);
    return 'error';
  }
}

/** "Restore purchases" in Settings. Returns the resulting plan. */
export async function restorePurchases(): Promise<Plan> {
  if (!(await initPurchases())) return getPlan();
  return applyCustomerInfo(await Purchases.restorePurchases());
}

/** Link purchases to the Better Auth user id after sign-in (webhook mirrors to Postgres). */
export async function logIn(userId: string): Promise<Plan> {
  if (!(await initPurchases())) return getPlan();
  const { customerInfo } = await Purchases.logIn(userId);
  return applyCustomerInfo(customerInfo);
}

/** Back to an anonymous RevenueCat user on sign-out. */
export async function logOut(): Promise<Plan> {
  if (!(await initPurchases())) return getPlan();
  try {
    return applyCustomerInfo(await Purchases.logOut());
  } catch {
    // logOut throws when the current user is already anonymous
    return getPlan();
  }
}

/** Platform "Manage subscription" sheet / page. */
export async function showManageSubscriptions(): Promise<void> {
  if (!(await initPurchases())) return;
  await Purchases.showManageSubscriptions();
}
