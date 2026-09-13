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

// Global in-memory registry map
export const FEATURE_MAP_REGISTRY: Record<string, SubjectFeatureMap> = {
  dsa: {
    code: 'dsa',
    title: 'Data Structures & Algorithms',
    totalWeight: 100,
    features: [
      { id: 'arrays_strings_patterns', name: 'Arrays, Strings & Problem-Solving Patterns', weight: 15 },
      { id: 'binary_search', name: 'Binary Search & Searching Algorithms', weight: 10 },
      { id: 'graph_representation_traversals', name: 'Graph Representation & BFS/DFS Traversals', weight: 10 },
      { id: 'trees_bst', name: 'Trees & Self-Balancing Trees (BST, AVL, RB)', weight: 10 },
      { id: 'recursion_backtracking', name: 'Recursion & Backtracking', weight: 8 },
      { id: 'hash_tables', name: 'Hash Tables / Hash Maps', weight: 8 },
      { id: 'heaps_priority_queues', name: 'Heaps & Priority Queues', weight: 6 },
      { id: 'topological_sort_cycle_detection', name: 'Topological Sort & Cycle Detection', weight: 5 },
      { id: 'dsu_mst', name: 'Disjoint Set Union & Minimum Spanning Trees', weight: 5 },
      { id: 'shortest_path', name: 'Shortest Path Algorithms', weight: 5 },
      { id: 'stacks_queues', name: 'Stacks, Queues, and Monotonic Structures', weight: 5 },
      { id: 'linked_lists', name: 'Linked Lists', weight: 4 },
      { id: 'sorting_algorithms', name: 'Sorting Algorithms', weight: 3 },
      { id: 'greedy_algorithms', name: 'Greedy Algorithms', weight: 2 },
      { id: 'bit_manipulation', name: 'Bit Manipulation', weight: 2 },
      { id: 'math_dsa', name: 'Math for DSA', weight: 1 },
      { id: 'string_matching', name: 'String Algorithms & Pattern Matching', weight: 1 },
      { id: 'segment_fenwick_trees', name: 'Segment Trees & Fenwick Trees', weight: 1 },
      { id: 'advanced_structures', name: 'Bespoke Systems Structures', weight: 1 },
      { id: 'cpp_essentials', name: 'C++ Language Essentials for DSA', weight: 1 },
    ],
  },
};

/**
 * Dynamically appends or updates a feature map imported from a file/notebook
 */
export function registerCustomFeatureMap(code: string, mapData: any): SubjectFeatureMap {
  const codeKey = (code || mapData?.subject_code || mapData?.code || '').toLowerCase();
  if (!codeKey) return FEATURE_MAP_REGISTRY['dsa'];

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
