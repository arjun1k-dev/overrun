import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { BookOpen, Folder, RefreshCw, CheckCircle, AlertCircle, FileText, Tag, ArrowUpRight, Plus, Send, Zap, Filter } from 'lucide-react';
import { KnowledgeFolderPicker } from './KnowledgeFolderPicker';

export function ObsidianSyncCard() {
  const { obsidianConfig, obsidianNotes, setObsidianVaultPath, setObsidianNotes } = useStore();

  const [inputPath, setInputPath] = useState(obsidianConfig.vaultPath || '');
  const [subfolder, setSubfolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Quick note creation form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('study, concept');
  const [newCategory, setNewCategory] = useState('Subjects/NMCP');
  const [newContent, setNewContent] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const handleScan = async (pathOverride?: string, subfolderOverride?: string) => {
    const targetPath = pathOverride || inputPath;
    const targetSubfolder = subfolderOverride !== undefined ? subfolderOverride : subfolder;

    if (!targetPath.trim()) {
      setError('Please enter a valid local Obsidian Vault folder path.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/obsidian/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPath: targetPath, subfolder: targetSubfolder }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan vault directory');
      }

      setObsidianVaultPath(data.vaultPath);
      setObsidianNotes(data.notes);
      setSuccessMsg(`Successfully indexed ${data.totalNotes} notes ${targetSubfolder ? `from subfolder "${targetSubfolder}"` : 'from vault'}!`);
    } catch (err: any) {
      setError(err.message || 'Error scanning Obsidian vault');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleVault = async () => {
    const demoPath = '/home/arjun/Projects/overrun/knowledge';
    setInputPath(demoPath);
    handleScan(demoPath, subfolder);
  };

  const handleZeroTokenSync = async () => {
    if (!inputPath.trim()) {
      setError('Please specify a valid vault folder path.');
      return;
    }

    setSyncLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/obsidian/sync-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPath: inputPath, subfolder }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Zero-token sync failed');
      }

      setSuccessMsg(`⚡ Zero-Token Sync Complete! Inserted/updated ${data.tasksSynced} tasks into SQLite db/custom.db (0 LLM tokens).`);
    } catch (err: any) {
      setError(err.message || 'Error executing zero-token sync');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPath.trim()) {
      setError('Please set and scan an Obsidian Vault folder path first.');
      return;
    }
    if (!newTitle.trim() || !newContent.trim()) {
      setError('Note title and content are required.');
      return;
    }

    setAddLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/obsidian/add-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultPath: inputPath,
          title: newTitle,
          content: newContent,
          tags: newTags,
          folder: newCategory,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create note');
      }

      setSuccessMsg(`Saved "${data.title}.md" directly to Obsidian Vault in ${newCategory || 'root'}!`);
      setNewTitle('');
      setNewContent('');
      setShowAddForm(false);
      handleScan();
    } catch (err: any) {
      setError(err.message || 'Error adding note to Obsidian');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Browser File System Knowledge Initializer */}
      <KnowledgeFolderPicker />

      <div className="clay-card rounded-2xl p-6 border-4 border-black bg-white text-black">
        <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#00F0FF] text-black border-3 border-black shadow-[3px_3px_0px_#000]">
            <BookOpen className="w-6 h-6 stroke-[3]" />
          </div>
          <div>
            <h3 className="font-black text-xl text-black flex items-center gap-2">
              Obsidian Knowledge Vault
              <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-[#CCFF00] text-black border-2 border-black">
                Direct Sync
              </span>
            </h3>
            <p className="text-xs font-bold text-black">
              Connect your local Obsidian Markdown vault & subfolders to feed targeted context to AI.
            </p>
          </div>
        </div>

        {obsidianConfig.lastSyncedAt && (
          <div className="text-right text-xs font-mono font-bold text-black">
            <span>Last synced: {new Date(obsidianConfig.lastSyncedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Path & Subfolder Input Form */}
      <div className="space-y-3 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2 relative">
            <label className="block text-[11px] font-black text-black mb-1">
              Local Vault Folder Path
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 text-black absolute left-3 top-3 stroke-[3]" />
              <input
                type="text"
                value={inputPath}
                onChange={(e) => setInputPath(e.target.value)}
                placeholder="/home/arjun/Documents/ObsidianVault"
                className="w-full bg-white border-3 border-black rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-black placeholder-slate-500 focus:outline-none focus:bg-[#CCFF00] shadow-[3px_3px_0px_#000]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-black mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-black stroke-[3]" /> Subfolder Filter
            </label>
            <input
              type="text"
              value={subfolder}
              onChange={(e) => setSubfolder(e.target.value)}
              placeholder="e.g. Subjects/NMCP"
              className="w-full bg-white border-3 border-black rounded-xl px-3 py-2 text-xs font-bold text-black placeholder-slate-500 focus:outline-none focus:bg-[#CCFF00] shadow-[3px_3px_0px_#000]"
            />
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => handleScan()}
            disabled={loading}
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#00F0FF] hover:bg-[#CCFF00] text-black font-black text-xs rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[3] ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Scan Vault / Folder'}
          </button>

          <button
            onClick={handleZeroTokenSync}
            disabled={syncLoading}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CCFF00] hover:bg-[#00F0FF] text-black font-black text-xs rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 stroke-[3] ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'Syncing...' : '⚡ Zero-Token Vault ↔ DB Sync'}
          </button>

          <button
            onClick={async () => {
              if (!inputPath.trim()) return;
              try {
                const res = await fetch('/api/obsidian/export-what-i-know', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    vaultPath: inputPath,
                    notes: obsidianNotes,
                    goals: useStore.getState().memoryGoals,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  setSuccessMsg(`Exported what_i_know.md to vault for NotebookLM!`);
                }
              } catch (e: any) {
                setError('Failed to export what_i_know.md');
              }
            }}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF007F] text-white hover:bg-[#FFE600] hover:text-black font-black text-xs rounded-xl border-3 border-black shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 stroke-[3]" />
            Export what_i_know.md
          </button>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="hidden sm:block">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? 'Close Form' : '+ Add New Knowledge Note to Vault'}
            </button>
          </div>
          <div className="block sm:hidden">
            <span className="text-slate-500 font-semibold italic flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Knowledge (PC Only Feature)
            </span>
          </div>

          <button
            onClick={handleCreateSampleVault}
            className="text-slate-400 hover:text-purple-300 underline cursor-pointer flex items-center gap-1"
          >
            Load Sample Demo Vault <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <form onSubmit={handleAddNote} className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-purple-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-purple-300">
            <span>📝 Feed New Knowledge Note with YAML Frontmatter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Note Title (e.g. Backprop Calculus)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="text"
              placeholder="Subfolder (e.g. Subjects/NMCP)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
            <input
              type="text"
              placeholder="Tags (comma-separated: study, exam)"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <textarea
            rows={3}
            placeholder="Write note content, formulas, or YAML task lines..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs rounded-lg transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {addLoading ? 'Saving...' : 'Save to Vault'}
            </button>
          </div>
        </form>
      )}

      {/* Status Banners */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Scanned Notes Preview Grid */}
      {obsidianNotes.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-3 text-xs font-semibold text-slate-300">
            <span>Indexed Notes ({obsidianNotes.length})</span>
            <span className="text-purple-400">Context active for AI timetable prompt</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
            {obsidianNotes.map((note, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-purple-500/30 transition-all text-xs"
              >
                <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1 truncate">
                  <FileText className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span className="truncate" title={note.title}>{note.title}</span>
                </div>

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {note.tags.slice(0, 4).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px]"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {note.summarySnippet && (
                  <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed">
                    {note.summarySnippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center p-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs">
          No Obsidian notes indexed yet. Enter your local vault directory above and click <strong>Scan Vault / Folder</strong>.
        </div>
      )}
      </div>
    </div>
  );
}
