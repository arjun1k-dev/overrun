'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { parseYaml, yamlParser } from '@/engine/yaml-parser';
import { yamlTransformer } from '@/engine/yaml-transformer';
import { YAMLViewer } from '@/components/yaml-viewers/index';
import { CheckCircle, XCircle, FileText, Wand2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function YamlImportCard() {
  const [input, setInput] = useState('');
  const [parseResult, setParseResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTransformOptions, setShowTransformOptions] = useState(false);
  const { updateYamlState } = useStore();

  const handleParse = () => {
    if (!input.trim()) {
      setError('Please paste YAML content');
      return;
    }

    setError(null);
    const result = parseYaml(input);

    if (result.success) {
      setParseResult(result);
      setShowTransformOptions(true);
    } else {
      const errorMessages = result.errors.map(e =>
        `${e.path.length > 0 ? e.path.join('.') + ': ' : ''}${e.message}`
      ).join('\n');
      setError(errorMessages);
      setParseResult(null);
      setShowTransformOptions(false);
    }
  };

  const handleTransform = (toType: string) => {
    if (!parseResult) return;

    const transformed = yamlTransformer.transform(
      parseResult.type,
      toType,
      parseResult.data
    );

    if (transformed) {
      // Store in Zustand for viewing
      const id = `${toType}_${Date.now()}`;
      updateYamlState(toType as any, id, transformed);

      // Show success feedback
      alert(`Transformed to ${toType}! Check the YAML Viewers section.`);
    }
  };

  const getAvailableTransforms = () => {
    if (!parseResult) return [];
    return yamlTransformer.getAvailableTransforms(parseResult.type);
  };

  const clearInput = () => {
    setInput('');
    setParseResult(null);
    setError(null);
    setShowTransformOptions(false);
  };

  const canCopyPaste = parseResult ? yamlParser.isCopyPasteFriendly(parseResult.type) : false;

  return (
    <div className="max-card p-5 border-3 border-black shadow-[4px_4px_0px_#000]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 stroke-[2]" />
          <h3 className="text-sm font-black text-black uppercase">YAML Import</h3>
        </div>
        {canCopyPaste && (
          <div className="px-2 py-1 bg-[#CCFF00] text-black rounded border-2 border-black">
            <span className="text-[10px] font-black uppercase">Notebook LM Friendly</span>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-gray-600 mb-4 leading-relaxed">
        Paste YAML content from Notebook LM or other sources. The system will validate and display it.
      </p>

      {/* Textarea */}
      <div className="mb-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste YAML content here...

Example Notebook LM output:
---
version: '1.0.0'
type: 'quiz_result'
topic: 'NMCP Module 1'
date: '2026-08-24'
questions_correct: 4
questions_total: 5
progress_before: 40
progress_after: 65
identified_gaps: ['Newton-Raphson convergence']
next_focus: 'Gauss-Seidel stability'
confidence: 'medium'
---"
          className="w-full h-40 p-3 text-xs font-mono border-2 border-black rounded-lg bg-white resize-none focus:outline-none focus:border-[#4361EE]"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleParse}
          className="flex-1 py-2 px-3 bg-[#4361EE] text-white text-[10px] font-black uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_#000] hover:shadow-[1px_1px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center justify-center gap-1"
        >
          <CheckCircle className="w-3 h-3 stroke-[2]" />
          Parse & Validate
        </motion.button>

        {input && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={clearInput}
            className="py-2 px-3 bg-gray-200 text-black text-[10px] font-black uppercase rounded-lg border-2 border-black hover:bg-gray-300 transition-colors"
          >
            Clear
          </motion.button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-[#FF007F]/10 border-2 border-[#FF007F] rounded-lg">
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 stroke-[2] text-[#FF007F] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[#FF007F] uppercase mb-1">Validation Error</p>
              <pre className="text-[9px] text-gray-700 whitespace-pre-wrap font-mono">{error}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Parsed Result Display */}
      {parseResult && (
        <div className="space-y-4">
          {/* Parse Success Badge */}
          <div className="flex items-center gap-2 p-2 bg-[#CCFF00]/10 border-2 border-[#CCFF00] rounded-lg">
            <CheckCircle className="w-4 h-4 stroke-[2] text-[#CCFF00]" />
            <div className="flex-1">
              <p className="text-[10px] font-bold text-black uppercase">Valid YAML Detected</p>
              <p className="text-[9px] font-mono text-gray-600">
                Type: <span className="font-bold">{parseResult.type}</span>
              </p>
            </div>
          </div>

          {/* YAML Viewer */}
          <div>
            <YAMLViewer type={parseResult.type} data={parseResult.data} />
          </div>

          {/* Transform Options */}
          {showTransformOptions && (
            <div className="p-3 bg-[#4361EE]/10 border-2 border-[#4361EE]/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Wand2 className="w-4 h-4 stroke-[2] text-[#4361EE]" />
                <p className="text-[10px] font-bold text-black uppercase">Transform Options</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {getAvailableTransforms().map((transformKey) => {
                  const info = yamlTransformer.getTransformInfo(transformKey as any);
                  return (
                    <motion.button
                      key={transformKey}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleTransform(info.to)}
                      className="py-1.5 px-3 bg-white text-black text-[9px] font-black uppercase rounded border-2 border-black hover:border-[#4361EE] transition-colors"
                    >
                      {info.from} → {info.to}
                    </motion.button>
                  );
                })}
              </div>
              <p className="text-[9px] text-gray-600 mt-2">
                Click to transform and store in YAML Viewers section
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}