import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { addSavingsContribution, listContributions } from "@/lib/services/finance-savings-service";
import { createContributionSchema } from "@/lib/validation/finance";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;

    const contributions = await listContributions(userId, id);
    return apiSuccess(contributions);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await ensureAppUserId();
    const { id } = await params;
    const body = createContributionSchema.parse(await request.json());

    const contribution = await addSavingsContribution(userId, id, body.amountUsd);
    return apiSuccess(contribution, 201);
  } catch (error) {
    return apiError(error);
  }
}
