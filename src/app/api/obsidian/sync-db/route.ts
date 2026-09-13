import { NextResponse } from 'next/server';
import { syncVaultToDatabase } from '@/engine/vault-sync';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vaultPath, subfolder } = body;

    if (!vaultPath) {
      return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    }

    const result = await syncVaultToDatabase(vaultPath, subfolder || '');

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Sync failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      tasksSynced: result.tasksSynced,
      vaultPath,
      subfolder: subfolder || 'root',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Zero-token sync error' }, { status: 500 });
  }
}
