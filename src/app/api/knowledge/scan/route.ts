import { NextResponse } from 'next/server';

export const dynamic = "force-static";

// Return generic tutorial records so public static deployments remain 100% private
// and never expose local filesystem notes, while providing an active, non-blank tutorial screen.
export async function GET() {
  const tutorialRecords = [
    {
      file: 'Welcome_to_OVERRUN.md',
      path: '/tutorial/Welcome_to_OVERRUN.md',
      relativePath: 'tutorial/Welcome_to_OVERRUN.md',
      type: 'markdown_note',
      data: {
        title: 'Welcome to OVERRUN Tactical Knowledge Base',
        contentSnippet: 'OVERRUN is your local command center for tactical scheduling, knowledge curation, and time banking. All your personal notes stay 100% private on your device.',
      },
      source: 'tutorial',
    },
    {
      file: 'Tutorial_Local_Knowledge_Vault.md',
      path: '/tutorial/Tutorial_Local_Knowledge_Vault.md',
      relativePath: 'tutorial/Tutorial_Local_Knowledge_Vault.md',
      type: 'markdown_note',
      data: {
        title: 'Tutorial: Connecting Your Local Obsidian Vault',
        contentSnippet: 'Click "Connect Local Vault" in the Knowledge tab to browse your local Markdown folder using browser File System Access API. Zero cloud uploads required.',
      },
      source: 'tutorial',
    },
    {
      file: 'Tutorial_Time_Bank.md',
      path: '/tutorial/Tutorial_Time_Bank.md',
      relativePath: 'tutorial/Tutorial_Time_Bank.md',
      type: 'markdown_note',
      data: {
        title: 'Tutorial: Understanding Time Bank & Priority Allocation',
        contentSnippet: 'Stream A (Deep Work), Stream B (Vault Review), and Stream C (Routine) categorize your time blocks to maintain peak output and clear daily audit logs.',
      },
      source: 'tutorial',
    },
  ];

  return NextResponse.json({
    success: true,
    count: tutorialRecords.length,
    records: tutorialRecords,
  });
}
