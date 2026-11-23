import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/security';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('aegis_session_jwt')?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      session: {
        userId: payload.userId,
        schoolId: payload.schoolId,
        role: payload.role,
        inviteCode: payload.inviteCode,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ authenticated: false, message: err?.message }, { status: 500 });
  }
}
