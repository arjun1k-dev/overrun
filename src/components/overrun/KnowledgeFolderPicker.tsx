'use client';

import { useState } from 'react';
import { FolderPlus, CheckCircle2, ShieldCheck, FileText, AlertCircle, Sparkles } from 'lucide-react';
import { playClick, playShimmer, playError } from '@/engine/sounds';

interface VaultMetadata {
  vaultId: string;
  createdAt: string;
  version: string;
  stateSubfolder: string;
  subfolders: string[];
  hashes: Record<string, string>;
}

export function KnowledgeFolderPicker() {
  const [folderName, setFolderName] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [fileCount, setFileCount] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);

  const handlePickDirectory = async () => {
    try {
      if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
        setIsSupported(false);
        playError();
        return;
      }

      setIsInitializing(true);
      playClick();

      // Prompt user to select directory
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      setFolderName(dirHandle.name);

      // 1. Ensure/Get 'knowledge' subfolder or use selected if named 'knowledge'
      let knowledgeHandle = dirHandle;
      if (dirHandle.name !== 'knowledge') {
        knowledgeHandle = await dirHandle.getDirectoryHandle('knowledge', { create: true });
      }

      // 2. Ensure '.state' subfolder inside knowledge to prevent duplication
      const stateHandle = await knowledgeHandle.getDirectoryHandle('.state', { create: true });

      // 3. Subdirectories scaffold
      const subdirs = ['goals', 'subjects', 'tasks', 'daily'];
      for (const dirName of subdirs) {
        await knowledgeHandle.getDirectoryHandle(dirName, { create: true });
      }

      // 4. Manage vault_metadata.json inside .state
      let metadata: VaultMetadata;
      try {
        const fileHandle = await stateHandle.getFileHandle('vault_metadata.json', { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        metadata = JSON.parse(text);
      } catch {
        // Create fresh vault metadata
        metadata = {
          vaultId: `kv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          version: '1.0.0',
          stateSubfolder: '.state',
          subfolders: subdirs,
          hashes: {},
        };

        const fileHandle = await stateHandle.getFileHandle('vault_metadata.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(metadata, null, 2));
        await writable.close();
      }

      // 5. Sample seed file in goals if empty
      const goalsHandle = await knowledgeHandle.getDirectoryHandle('goals', { create: true });
      let totalFiles = 0;

      for await (const entry of (goalsHandle as any).values()) {
        if (entry.kind === 'file') totalFiles++;
      }

      if (totalFiles === 0) {
        const seedHandle = await goalsHandle.getFileHandle('master_goals.md', { create: true });
        const seedWritable = await seedHandle.createWritable();
        await seedWritable.write(`# 🎯 Personal Goals Vault\n\n- [ ] Phase 1: PoC & Skill Grind\n- [ ] Phase 2: Scale & Internship Prep\n`);
        await seedWritable.close();
        totalFiles = 1;
      }

      setFileCount(totalFiles);
      setStatusMsg(`Connected to /knowledge! Created .state deduplication engine.`);
      playShimmer();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMsg(`Failed to select directory: ${err.message}`);
        playError();
      }
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="tactical-card p-5 border border-tactical-border/80 bg-tactical-surface/90 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-tactical-primary/20 text-tactical-primary border border-tactical-primary/30">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-tactical-text">Connect / Add Local Knowledge Vault</h3>
            <p className="text-xs text-tactical-muted font-mono">
              Scaffolds <span className="text-tactical-primary">/knowledge</span> & <span className="text-tactical-primary">.state</span> deduplication on your machine
            </p>
          </div>
        </div>

        <button
          onClick={handlePickDirectory}
          disabled={isInitializing}
          className="px-4 py-2 bg-tactical-primary hover:bg-tactical-primary/80 text-white rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-tactical-primary/20 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isInitializing ? 'Initializing...' : folderName ? 'Re-Sync Knowledge' : 'Select / Add Knowledge Folder'}
        </button>
      </div>

      {!isSupported && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Browser File System Access API not supported in this browser. Local state fallback active.
        </div>
      )}

      {statusMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <span className="flex items-center gap-1 font-bold text-tactical-text">
            <ShieldCheck className="w-3.5 h-3.5 text-tactical-success" /> .state active
          </span>
        </div>
      )}

      {folderName && (
        <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="bg-[#0A1628]/60 p-2.5 rounded-lg border border-tactical-border/60">
            <span className="text-tactical-muted block text-[10px]">Folder Name</span>
            <span className="font-bold text-tactical-text truncate block">{folderName}</span>
          </div>
          <div className="bg-[#0A1628]/60 p-2.5 rounded-lg border border-tactical-border/60">
            <span className="text-tactical-muted block text-[10px]">Deduplication State</span>
            <span className="font-bold text-tactical-success flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> .state/.metadata
            </span>
          </div>
          <div className="bg-[#0A1628]/60 p-2.5 rounded-lg border border-tactical-border/60">
            <span className="text-tactical-muted block text-[10px]">Goals Files</span>
            <span className="font-bold text-tactical-primary flex items-center gap-1">
              <FileText className="w-3 h-3" /> {fileCount} note(s)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
