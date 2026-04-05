import { NextResponse } from "next/server";

const BACKEND_URL = process.env.FLIPPERIQ_API_BASE_URL ?? "http://127.0.0.1:8000";

async function forwardRequest(request, { params }) {
  const resolvedParams = await params;
  const path = resolvedParams.path ?? [];
  const search = new URL(request.url).search;
  const targetUrl = `${BACKEND_URL}/${path.join("/")}${search}`;

  const init = {
    method: request.method,
    headers: {}
  };

  const contentType = request.headers.get("content-type");
  if (contentType) {
    init.headers["content-type"] = contentType;
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.text();
  }

  // Keep browser calls same-origin while the API continues to live on FastAPI.
  const response = await fetch(targetUrl, init);
  const body = await response.text();

  return new NextResponse(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json"
    }
  });
}

export const dynamic = "force-dynamic";

export async function GET(request, context) {
  return forwardRequest(request, context);
}

export async function POST(request, context) {
  return forwardRequest(request, context);
}

export async function PUT(request, context) {
  return forwardRequest(request, context);
}

export async function DELETE(request, context) {
  return forwardRequest(request, context);
}
