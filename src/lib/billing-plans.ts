// Edit these to match the Plans you create in the Paystack Dashboard
// (Dashboard → Products → Plans → Create). planCode must match a real
// Paystack Plan code (starts with "PLN_"), and should also be reflected in
// the planFromPlanCode() map in supabase/functions/paystack-webhook/index.ts
// so the webhook can identify which LexFlow plan tier a subscription maps to.
export interface BillingPlan {
  id: "starter" | "pro" | "enterprise";
  name: string;
  planCode: string;
  priceLabel: string;
  description: string;
  features: string[];
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    planCode: "PLN_REPLACE_WITH_STARTER_PLAN_CODE",
    priceLabel: "KES 4,900/mo",
    description: "For a small practice getting started.",
    features: ["Up to 5 staff users", "Unlimited clients & matters", "Document storage"],
  },
  {
    id: "pro",
    name: "Pro",
    planCode: "PLN_REPLACE_WITH_PRO_PLAN_CODE",
    priceLabel: "KES 14,900/mo",
    description: "For a growing firm managing billing at volume.",
    features: ["Up to 25 staff users", "Everything in Starter", "Client portal", "Priority support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    planCode: "PLN_REPLACE_WITH_ENTERPRISE_PLAN_CODE",
    priceLabel: "Contact us",
    description: "For larger firms with custom needs.",
    features: ["Unlimited staff users", "Everything in Pro", "Custom onboarding"],
  },
];
