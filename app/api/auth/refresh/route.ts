// app/api/refresh/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';
import Cookies from 'js-cookie'

export async function POST(request: Request) {
    try {
        const refreshToken = Cookies.get('refreshToken');
        // const refreshToken = request.cookies.get('refreshToken')?.value;
        console.log("refresh token", refreshToken);

        if (!refreshToken) {
            return NextResponse.json({ message: 'No refresh token found' }, { status: 401 });
        }
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
        console.log("response", response);
        const { access_token } = response.data;

        // Update the accessToken cookie
          Cookies.set('accessToken', access_token, {
            expires: 1,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/',
        });


        return NextResponse.json({ access_token });

    } catch (error: any) {
        console.error("Token refresh error:", error);
        // Expire both cookies on refresh failure
        Cookies.remove('accessToken', { path: '/' });
        Cookies.remove('refreshToken', { path: '/' });

        return NextResponse.json({ message: 'Refresh token invalid or expired', error:error.message }, { status: 401 });
    }
}