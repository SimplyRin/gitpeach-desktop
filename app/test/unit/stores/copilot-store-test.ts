import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  DefaultCopilotModel,
  getCopilotModelWithTemporaryMockUsageBilling,
  getLowestReasoningEffort,
  getPreferredDefaultModel,
} from '../../../src/lib/stores/copilot-store'
import {
  type CopilotModelInfo,
  normalizeCopilotModelBilling,
  normalizeCopilotModelInfo,
} from '../../../src/lib/copilot/model-info'

function makeModel(
  overrides: Partial<CopilotModelInfo> & Pick<CopilotModelInfo, 'id' | 'name'>
): CopilotModelInfo {
  return {
    capabilities: {
      supports: { vision: false, reasoningEffort: false },
      limits: { max_context_window_tokens: 128000 },
    },
    ...overrides,
  }
}

describe('getLowestReasoningEffort', () => {
  it('returns undefined when model has no supported reasoning efforts', () => {
    const model = makeModel({ id: 'a', name: 'A' })
    assert.strictEqual(getLowestReasoningEffort(model), undefined)
  })

  it('returns undefined when supportedReasoningEfforts is empty', () => {
    const model = makeModel({
      id: 'a',
      name: 'A',
      supportedReasoningEfforts: [],
    })
    assert.strictEqual(getLowestReasoningEffort(model), undefined)
  })

  it('returns low when it is the only supported effort', () => {
    const model = makeModel({
      id: 'a',
      name: 'A',
      supportedReasoningEfforts: ['low'],
    })
    assert.strictEqual(getLowestReasoningEffort(model), 'low')
  })

  it('returns low when multiple efforts are supported', () => {
    const model = makeModel({
      id: 'a',
      name: 'A',
      supportedReasoningEfforts: ['medium', 'high', 'low'],
    })
    assert.strictEqual(getLowestReasoningEffort(model), 'low')
  })

  it('returns medium when low is not supported', () => {
    const model = makeModel({
      id: 'a',
      name: 'A',
      supportedReasoningEfforts: ['high', 'medium'],
    })
    assert.strictEqual(getLowestReasoningEffort(model), 'medium')
  })

  it('returns xhigh when it is the only supported effort', () => {
    const model = makeModel({
      id: 'a',
      name: 'A',
      supportedReasoningEfforts: ['xhigh'],
    })
    assert.strictEqual(getLowestReasoningEffort(model), 'xhigh')
  })
})

describe('getPreferredDefaultModel', () => {
  it('returns null for an empty model list', () => {
    assert.strictEqual(getPreferredDefaultModel([]), null)
  })

  it('returns the default model when it is in the list', () => {
    const defaultModel = makeModel({
      id: DefaultCopilotModel,
      name: 'GPT-5 mini',
      billing: { kind: 'premium-requests', multiplier: 1 },
    })
    const other = makeModel({
      id: 'other-model',
      name: 'Other',
      billing: { kind: 'premium-requests', multiplier: 0.5 },
    })
    // Even though 'other' is cheaper, the default model is preferred
    const result = getPreferredDefaultModel([other, defaultModel])
    assert.strictEqual(result, defaultModel)
  })

  it('falls back to the cheapest model by billing multiplier', () => {
    const expensive = makeModel({
      id: 'expensive',
      name: 'Expensive',
      billing: { kind: 'premium-requests', multiplier: 10 },
    })
    const cheap = makeModel({
      id: 'cheap',
      name: 'Cheap',
      billing: { kind: 'premium-requests', multiplier: 0.1 },
    })
    const mid = makeModel({
      id: 'mid',
      name: 'Mid',
      billing: { kind: 'premium-requests', multiplier: 2 },
    })
    const result = getPreferredDefaultModel([expensive, mid, cheap])
    assert.strictEqual(result, cheap)
  })

  it('treats models without billing info as most expensive', () => {
    const noBilling = makeModel({
      id: 'no-billing',
      name: 'No Billing',
    })
    const withBilling = makeModel({
      id: 'with-billing',
      name: 'With Billing',
      billing: { kind: 'premium-requests', multiplier: 5 },
    })
    const result = getPreferredDefaultModel([noBilling, withBilling])
    assert.strictEqual(result, withBilling)
  })

  it('returns the single model when only one is available', () => {
    const only = makeModel({
      id: 'only-model',
      name: 'Only Model',
      billing: { kind: 'premium-requests', multiplier: 3 },
    })
    const result = getPreferredDefaultModel([only])
    assert.strictEqual(result, only)
  })

  it('prefers default model regardless of billing cost', () => {
    const defaultModel = makeModel({
      id: DefaultCopilotModel,
      name: 'GPT-5 mini',
      billing: { kind: 'premium-requests', multiplier: 100 },
    })
    const cheapModel = makeModel({
      id: 'cheap',
      name: 'Cheap',
      billing: { kind: 'premium-requests', multiplier: 0.01 },
    })
    const result = getPreferredDefaultModel([cheapModel, defaultModel])
    assert.strictEqual(result, defaultModel)
  })

  it('treats usage billing as unknown premium request cost', () => {
    const usageBilled = makeModel({
      id: 'usage-billed',
      name: 'Usage Billed',
      billing: {
        kind: 'usage',
        token_prices: {
          batch_size: 1000000,
          default: {
            cache_price: 50,
            context_max: 200000,
            input_price: 500,
            output_price: 2500,
          },
        },
      },
    })
    const premiumRequestsBilled = makeModel({
      id: 'premium-requests-billed',
      name: 'Premium Requests Billed',
      billing: { kind: 'premium-requests', multiplier: 2 },
    })
    const result = getPreferredDefaultModel([
      usageBilled,
      premiumRequestsBilled,
    ])
    assert.strictEqual(result, premiumRequestsBilled)
  })
})

describe('getCopilotModelWithTemporaryMockUsageBilling', () => {
  it('adds temporary mocked usage billing', () => {
    const model = getCopilotModelWithTemporaryMockUsageBilling(
      makeModel({ id: 'mocked', name: 'Mocked' })
    )

    const billing = model.billing
    assert.ok(billing !== undefined)
    assert.strictEqual(billing.kind, 'usage')

    const tokenPrices = billing.token_prices
    assert.strictEqual(tokenPrices.batch_size, 1000000)
    assert.ok(tokenPrices.long_context !== undefined)

    for (const tokenPrice of [tokenPrices.default, tokenPrices.long_context]) {
      assert.ok(tokenPrice.cache_price > 0)
      assert.ok(tokenPrice.context_max > 0)
      assert.ok(tokenPrice.input_price > 0)
      assert.ok(tokenPrice.output_price > 0)
    }
  })
})

describe('normalizeCopilotModelBilling', () => {
  it('normalizes SDK multiplier billing to premium requests billing', () => {
    assert.deepStrictEqual(normalizeCopilotModelBilling({ multiplier: 2 }), {
      kind: 'premium-requests',
      multiplier: 2,
    })
  })

  it('normalizes REST usage billing to usage billing', () => {
    assert.deepStrictEqual(
      normalizeCopilotModelBilling({
        token_prices: {
          batch_size: 1000000,
          default: {
            cache_price: 50,
            context_max: 200000,
            input_price: 500,
            output_price: 2500,
          },
          long_context: {
            cache_price: 50,
            context_max: 936000,
            input_price: 500,
            output_price: 2500,
          },
        },
      }),
      {
        kind: 'usage',
        token_prices: {
          batch_size: 1000000,
          default: {
            cache_price: 50,
            context_max: 200000,
            input_price: 500,
            output_price: 2500,
          },
          long_context: {
            cache_price: 50,
            context_max: 936000,
            input_price: 500,
            output_price: 2500,
          },
        },
      }
    )
  })

  it('normalizes model info billing', () => {
    assert.deepStrictEqual(
      normalizeCopilotModelInfo(makeModel({ id: 'a', name: 'A' })),
      makeModel({ id: 'a', name: 'A' })
    )
  })
})
