/**
 * Unit tests for Model Configuration
 */
import { describe, it, expect } from 'vitest';
import {
  VETTING_MODELS,
  ModelTier,
  ModelFamily,
  getModelsByTier,
  getModelsByFamily,
  getModelById,
  getAllModelIds,
  getRecommendedModel,
} from '../../src/models/model-config';

describe('Model Configuration', () => {
  describe('VETTING_MODELS', () => {
    it('should contain models from all tiers', () => {
      const tiers = new Set(VETTING_MODELS.map(m => m.tier));
      expect(tiers.has(ModelTier.MOBILE)).toBe(true);
      expect(tiers.has(ModelTier.MEDIUM)).toBe(true);
      expect(tiers.has(ModelTier.HEAVY)).toBe(true);
    });

    it('should have required fields for each model', () => {
      VETTING_MODELS.forEach(model => {
        expect(model.id).toBeDefined();
        expect(model.displayName).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.family).toBeDefined();
        expect(model.tier).toBeDefined();
        expect(model.parameterCount).toBeDefined();
        expect(model.quantization).toBeDefined();
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.estimatedVRAM).toBeDefined();
        expect(model.recommendedConfig).toBeDefined();
        expect(model.recommendedConfig.temperature).toBeGreaterThanOrEqual(0);
        expect(model.recommendedConfig.top_p).toBeGreaterThan(0);
      });
    });

    it('should have unique model IDs', () => {
      const ids = VETTING_MODELS.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have mobile tier models under 1.5B parameters', () => {
      const mobileModels = VETTING_MODELS.filter(m => m.tier === ModelTier.MOBILE);
      mobileModels.forEach(model => {
        const params = parseFloat(model.parameterCount.replace(/[^0-9.]/g, ''));
        // Mobile models should be <= 1.5B (accounting for M vs B)
        const isSmall = model.parameterCount.includes('M') || params <= 1.5;
        expect(isSmall).toBe(true);
      });
    });
  });

  describe('getModelsByTier', () => {
    it('should return only mobile tier models', () => {
      const models = getModelsByTier(ModelTier.MOBILE);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(m => expect(m.tier).toBe(ModelTier.MOBILE));
    });

    it('should return only medium tier models', () => {
      const models = getModelsByTier(ModelTier.MEDIUM);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(m => expect(m.tier).toBe(ModelTier.MEDIUM));
    });

    it('should return only heavy tier models', () => {
      const models = getModelsByTier(ModelTier.HEAVY);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(m => expect(m.tier).toBe(ModelTier.HEAVY));
    });
  });

  describe('getModelsByFamily', () => {
    it('should return Llama family models', () => {
      const models = getModelsByFamily(ModelFamily.LLAMA);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(m => expect(m.family).toBe(ModelFamily.LLAMA));
    });

    it('should return SmolLM family models', () => {
      const models = getModelsByFamily(ModelFamily.SMOLLM);
      expect(models.length).toBeGreaterThan(0);
      models.forEach(m => expect(m.family).toBe(ModelFamily.SMOLLM));
    });

    it('should return empty array for non-existent family', () => {
      // @ts-expect-error - Testing invalid input
      const models = getModelsByFamily('nonexistent');
      expect(models.length).toBe(0);
    });
  });

  describe('getModelById', () => {
    it('should return model by valid ID', () => {
      const model = getModelById('SmolLM2-360M-Instruct-q4f16_1-MLC');
      expect(model).toBeDefined();
      expect(model?.displayName).toBe('SmolLM2 360M');
    });

    it('should return undefined for invalid ID', () => {
      const model = getModelById('nonexistent-model');
      expect(model).toBeUndefined();
    });

    it('should return correct model properties', () => {
      const model = getModelById('Llama-3.2-1B-Instruct-q4f32_1-MLC');
      expect(model).toBeDefined();
      expect(model?.provider).toBe('Meta');
      expect(model?.family).toBe(ModelFamily.LLAMA);
      expect(model?.tier).toBe(ModelTier.MEDIUM);
    });
  });

  describe('getAllModelIds', () => {
    it('should return all model IDs', () => {
      const ids = getAllModelIds();
      expect(ids.length).toBe(VETTING_MODELS.length);
      expect(Array.isArray(ids)).toBe(true);
      ids.forEach(id => expect(typeof id).toBe('string'));
    });
  });

  describe('getRecommendedModel', () => {
    it('should return mobile tier model for mobile devices', () => {
      const model = getRecommendedModel(true);
      expect(model).toBeDefined();
      expect(model.tier).toBe(ModelTier.MOBILE);
    });

    it('should return medium tier model for desktop devices', () => {
      const model = getRecommendedModel(false);
      expect(model).toBeDefined();
      expect(model.tier).toBe(ModelTier.MEDIUM);
    });
  });
});

describe('Model Configuration Validation', () => {
  it('should have valid quantization formats', () => {
    const validQuantizations = ['q4f16', 'q4f32', 'q0f16', 'q0f32', 'q4f16_1', 'q4f32_1'];
    VETTING_MODELS.forEach(model => {
      const hasValidQuant = validQuantizations.some(q => model.quantization.includes(q));
      expect(hasValidQuant).toBe(true);
    });
  });

  it('should have valid temperature values', () => {
    VETTING_MODELS.forEach(model => {
      expect(model.recommendedConfig.temperature).toBeGreaterThanOrEqual(0);
      expect(model.recommendedConfig.temperature).toBeLessThanOrEqual(2);
    });
  });

  it('should have valid top_p values', () => {
    VETTING_MODELS.forEach(model => {
      expect(model.recommendedConfig.top_p).toBeGreaterThan(0);
      expect(model.recommendedConfig.top_p).toBeLessThanOrEqual(1);
    });
  });

  it('should have context windows >= 1024', () => {
    VETTING_MODELS.forEach(model => {
      expect(model.contextWindow).toBeGreaterThanOrEqual(1024);
    });
  });
});
