import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TrendingUp, Shield, Cloud } from 'lucide-react';

export function LoginScreen() {
    const { signIn, isLoading } = useAuth();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex flex-col">
            {/* Header */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                {/* Logo and Title */}
                <div className="text-center mb-12">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <TrendingUp className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">พอร์ตหุ้น</h1>
                    <p className="text-slate-400">ระบบจัดการพอร์ตหุ้นครบวงจร</p>
                </div>

                {/* Features */}
                <div className="w-full max-w-sm space-y-4 mb-12">
                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">ติดตามผลกำไร-ขาดทุน</h3>
                            <p className="text-slate-400 text-sm">วิเคราะห์พอร์ตด้วยกราฟ</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Cloud className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">ซิงค์กับ Google Sheets</h3>
                            <p className="text-slate-400 text-sm">ข้อมูลปลอดภัย เข้าถึงได้ทุกที่</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-white font-medium">ใช้งาน Offline ได้</h3>
                            <p className="text-slate-400 text-sm">ซิงค์อัตโนมัติเมื่อออนไลน์</p>
                        </div>
                    </div>
                </div>

                {/* Sign In Button */}
                <div className="w-full max-w-sm">
                    <Button
                        onClick={signIn}
                        disabled={isLoading}
                        className="w-full h-14 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-xl shadow-lg flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                <span>เข้าสู่ระบบด้วย Google</span>
                            </>
                        )}
                    </Button>
                    <p className="text-slate-500 text-xs text-center mt-4">
                        ข้อมูลจะถูกเก็บใน Google Sheets ของคุณเอง
                    </p>
                </div>
            </div>

            {/* Footer */}
            <div className="py-6 text-center">
                <p className="text-slate-500 text-sm">Invest-Tracker PWA</p>
            </div>
        </div>
    );
}
