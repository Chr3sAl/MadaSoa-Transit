import { NextResponse } from "next/server";

import {
  getPublicLookupClientIdentifier,
  takePublicLookupRateLimit,
} from "@/lib/public-lookup-rate-limit";
import { lookupPublic } from "@/lib/repository";
import { publicLookupSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const rateLimit = await takePublicLookupRateLimit(getPublicLookupClientIdentifier(request));

  if (rateLimit.limited) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
    );

    return NextResponse.json(
      {
        message: "Too many lookup attempts. Please wait a minute and try again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfterSeconds.toString(),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const parsed = publicLookupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: parsed.error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 },
      );
    }

    const payload = await lookupPublic(
      parsed.data.mode,
      parsed.data.value,
      parsed.data.transportType,
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof SyntaxError ? "Invalid request body." : "Lookup failed.",
      },
      { status: error instanceof SyntaxError ? 400 : 500 },
    );
  }
}
