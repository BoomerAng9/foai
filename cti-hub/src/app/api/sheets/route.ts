import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

const GOOGLE_KEY = process.env.GOOGLE_KEY;

interface SheetsRequest {
  spreadsheet_id?: string;
  sheet_name?: string;
  title?: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

async function createSpreadsheet(title: string): Promise<string> {
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY || '',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Data' } }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to create spreadsheet');
  return data.spreadsheetId;
}

async function appendToSheet(
  spreadsheetId: string,
  sheetName: string,
  columns: string[],
  rows: Record<string, unknown>[],
): Promise<{ updatedRows: number; spreadsheetUrl: string }> {
  const values = [
    columns,
    ...rows.map(row => columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      return String(val);
    })),
  ];

  const range = `${sheetName}!A1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY || '',
    },
    body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to append to sheet');

  return {
    updatedRows: data.updates?.updatedRows || rows.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    if (!GOOGLE_KEY) {
      return NextResponse.json({ error: 'GOOGLE_KEY not configured' }, { status: 503 });
    }

    const body = (await request.json()) as SheetsRequest;
    const { columns, rows, title, sheet_name } = body;
    let { spreadsheet_id } = body;

    if (!columns || !rows || rows.length === 0) {
      return NextResponse.json({ error: 'columns and rows required' }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Too many rows (max 1,000)', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    // Create new spreadsheet if no ID provided
    if (!spreadsheet_id) {
      spreadsheet_id = await createSpreadsheet(title || `The Deploy Platform Export — ${new Date().toLocaleDateString()}`);
    }

    const result = await appendToSheet(spreadsheet_id, sheet_name || 'Data', columns, rows);

    return NextResponse.json({
      spreadsheet_id,
      ...result,
      rows_written: rows.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sheets API error' },
      { status: 500 },
    );
  }
}
