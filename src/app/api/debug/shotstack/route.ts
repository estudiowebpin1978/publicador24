import { NextResponse } from "next/server";
import { getShotstackApiKey, isShotstackConfigured } from "@/lib/video/shotstack";

export async function GET() {
  const hasKey = !!process.env.SHOTSTACK_API_KEY;
  const keyLength = process.env.SHOTSTACK_API_KEY?.length || 0;
  
  let getKeyResult = { success: false, error: null };
  try {
    const key = getShotstackApiKey();
    getKeyResult = { success: true, keyLength: key.length };
  } catch (e) {
    getKeyResult = { success: false, error: e instanceof Error ? e.message : "Unknown" };
  }
  
  const configured = isShotstackConfigured();
  
  return NextResponse.json({
    hasKey: !!process.env.SHOTSTACK_API_KEY,
    keyLength: process.env.SHOTSTACK_API_KEY?.length || 0,
    getKeyResult,
    configured,
  });
}