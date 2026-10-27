import { NextResponse, type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError } from "@/lib/http";
import { buildTransactionsCsv } from "@/lib/finance-csv";
import { exportTransactions } from "@/lib/services/finance-export-service";

// Not apiSuccess()'s {data} envelope — this endpoint returns a raw
// downloadable file (CSV or a JSON export document), not an API response.
export async function GET(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";
    const rows = await exportTransactions(userId);
    const dateStamp = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      const body = JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, transactions: rows }, null, 2);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="luyra-finance-transactions-${dateStamp}.json"`,
        },
      });
    }

    return new NextResponse(buildTransactionsCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="luyra-finance-transactions-${dateStamp}.csv"`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
