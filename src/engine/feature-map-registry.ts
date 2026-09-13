// ============================================================
// OVERRUN — Subject Feature Map & Dynamic Mastery Registry
// ============================================================

export interface FeatureTopic {
  id: string;
  name: string;
  weight: number; // Sums to 100 per module
}

export interface SubjectFeatureMap {
  code: string;
  title: string;
  totalWeight: number;
  features: FeatureTopic[];
}

// Global in-memory registry map (populated dynamically via imported feature maps)
export const FEATURE_MAP_REGISTRY: Record<string, SubjectFeatureMap> = {};

/**
 * Dynamically appends or updates a feature map imported from a file/notebook
 */
export function registerCustomFeatureMap(code: string, mapData: any): SubjectFeatureMap {
  const codeKey = (code || mapData?.subject_code || mapData?.code || '').toLowerCase();
  if (!codeKey) {
    return { code: 'general', title: 'General', totalWeight: 100, features: [] };
  }

  const title = mapData?.title || `${codeKey.toUpperCase()} Feature Map`;
  const totalWeight = Number(mapData?.total_weights || mapData?.totalWeight || 100);
  
  const rawFeatures = Array.isArray(mapData?.features) ? mapData.features : [];
  const features: FeatureTopic[] = rawFeatures.map((f: any, idx: number) => ({
    id: String(f.id || `topic_${idx + 1}`).toLowerCase(),
    name: String(f.name || f.title || `Topic ${idx + 1}`),
    weight: Number(f.weight) || 1,
  }));

  const featureMap: SubjectFeatureMap = {
    code: codeKey,
    title,
    totalWeight,
    features,
  };

  FEATURE_MAP_REGISTRY[codeKey] = featureMap;
  return featureMap;
}

export function getSubjectFeatureMap(code: string): SubjectFeatureMap | null {
  return FEATURE_MAP_REGISTRY[code.toLowerCase()] || null;
}
