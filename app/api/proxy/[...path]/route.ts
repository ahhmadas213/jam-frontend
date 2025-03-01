// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchWithBackendAuth } from "@/auth";

interface Params {
  path: string[];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<Params> } // Explicitly type params as a Promise
) {
  const params = await context.params; // Await the params
  const routePath = Array.isArray(params.path) ? params.path.join("/") : "";

  try {
    const response = await fetchWithBackendAuth(`/${routePath}${request.nextUrl.search}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("API proxy error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message === "No authentication token available") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const params = await context.params;
  const routePath = Array.isArray(params.path) ? params.path.join("/") : "";

  try {
    const body = await request.json();
    const response = await fetchWithBackendAuth(`/${routePath}`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("API proxy error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message === "No authentication token available") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const params = await context.params;
  const routePath = Array.isArray(params.path) ? params.path.join("/") : "";

  try {
    const body = await request.json();
    const response = await fetchWithBackendAuth(`/${routePath}`, {
      method: "PUT",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("API proxy error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message === "No authentication token available") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<Params> }
) {
  const params = await context.params;
  const routePath = Array.isArray(params.path) ? params.path.join("/") : "";

  try {
    const response = await fetchWithBackendAuth(`/${routePath}${request.nextUrl.search}`, {
      method: "DELETE",
    });
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("API proxy error:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.message === "No authentication token available") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}