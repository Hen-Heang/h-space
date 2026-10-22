import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { getMerchantNames, mergeMerchants, unmergeMerchants } from "@/lib/services/finance-merchant-alias-service";
import { mergeMerchantsSchema, unmergeMerchantsSchema } from "@/lib/validation/finance";

// Confirmed merchant merges plus suggested ones. Merging only changes how
// subscriptions are grouped; transaction descriptions are never rewritten.

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    return apiSuccess(await getMerchantNames(userId));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const { name, keys } = mergeMerchantsSchema.parse(await request.json());
    return apiSuccess(await mergeMerchants(userId, name, keys));
  } catch (error) {
    return apiError(error);
  }
}

// The merge name goes in the body: it's free text and may contain "/".
export async function DELETE(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const { name } = unmergeMerchantsSchema.parse(await request.json());
    await unmergeMerchants(userId, name);
    return apiSuccess({ name });
  } catch (error) {
    return apiError(error);
  }
}
