import { type NextRequest } from "next/server";
import { ensureAppUserId } from "@/lib/auth/ensure-app-user";
import { apiError, apiSuccess } from "@/lib/http";
import { addPaymentMethod, listPaymentMethods } from "@/lib/services/finance-lookup-service";
import { createPaymentMethodSchema } from "@/lib/validation/finance";

export async function GET() {
  try {
    const userId = await ensureAppUserId();
    const paymentMethods = await listPaymentMethods(userId);
    return apiSuccess(paymentMethods);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await ensureAppUserId();
    const body = createPaymentMethodSchema.parse(await request.json());

    const paymentMethod = await addPaymentMethod(userId, body);
    return apiSuccess(paymentMethod, 201);
  } catch (error) {
    return apiError(error);
  }
}
