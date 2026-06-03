import type { ModelInfo } from '@github/copilot-sdk'

export interface ICopilotPremiumRequestsBilling {
  readonly kind: 'premium-requests'
  readonly multiplier: number
}

export interface ICopilotUsageBillingTokenPrice {
  readonly cache_price: number
  readonly context_max: number
  readonly input_price: number
  readonly output_price: number
}

export interface ICopilotUsageBillingTokenPrices {
  readonly batch_size: number
  readonly default: ICopilotUsageBillingTokenPrice
  readonly long_context?: ICopilotUsageBillingTokenPrice
  readonly [key: string]: number | ICopilotUsageBillingTokenPrice | undefined
}

export interface ICopilotUsageBilling {
  readonly kind: 'usage'
  readonly token_prices: ICopilotUsageBillingTokenPrices
}

export type CopilotModelBilling =
  | ICopilotPremiumRequestsBilling
  | ICopilotUsageBilling

/**
 * Temporary app-side Copilot model info shape.
 *
 * This accepts both the current SDK premium request billing shape and the REST
 * API usage billing shape. While usage billing is not yet available through
 * the SDK, CopilotStore injects temporary mocked data for testing purposes;
 * those mocked usage values must not be treated as real prices.
 */
export type CopilotModelInfo = Omit<ModelInfo, 'billing'> & {
  readonly billing?: CopilotModelBilling
}

type CopilotModelInfoInput = Omit<ModelInfo, 'billing'> & {
  readonly billing?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isCopilotUsageBillingTokenPrice = (
  value: unknown
): value is ICopilotUsageBillingTokenPrice => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.cache_price === 'number' &&
    typeof value.context_max === 'number' &&
    typeof value.input_price === 'number' &&
    typeof value.output_price === 'number'
  )
}

const isCopilotUsageBillingTokenPrices = (
  value: unknown
): value is ICopilotUsageBillingTokenPrices => {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.batch_size === 'number' &&
    isCopilotUsageBillingTokenPrice(value.default) &&
    (value.long_context === undefined ||
      isCopilotUsageBillingTokenPrice(value.long_context))
  )
}

export function normalizeCopilotModelBilling(
  billing: unknown
): CopilotModelBilling | undefined {
  if (!isRecord(billing)) {
    return undefined
  }

  if (
    (billing.kind === undefined || billing.kind === 'premium-requests') &&
    typeof billing.multiplier === 'number'
  ) {
    return {
      kind: 'premium-requests',
      multiplier: billing.multiplier,
    }
  }

  const tokenPrices = billing.token_prices
  if (
    (billing.kind === undefined || billing.kind === 'usage') &&
    isCopilotUsageBillingTokenPrices(tokenPrices)
  ) {
    return {
      kind: 'usage',
      token_prices: tokenPrices,
    }
  }

  return undefined
}

export function normalizeCopilotModelInfo(
  model: CopilotModelInfoInput
): CopilotModelInfo {
  const { billing, ...modelWithoutBilling } = model
  const normalizedBilling = normalizeCopilotModelBilling(billing)

  return normalizedBilling === undefined
    ? modelWithoutBilling
    : { ...modelWithoutBilling, billing: normalizedBilling }
}

export function getCopilotModelBillingMultiplier(
  billing: CopilotModelBilling | undefined
): number | undefined {
  return billing?.kind === 'premium-requests' ? billing.multiplier : undefined
}
