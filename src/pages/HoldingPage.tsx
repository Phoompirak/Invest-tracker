import { useParams, useNavigate } from "react-router-dom";
import { usePortfolio } from "@/hooks/usePortfolio";
import { HoldingDetailView } from "@/components/portfolio/HoldingDetailView";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HoldingPage() {
    const { ticker } = useParams<{ ticker: string }>();
    const navigate = useNavigate();
    const {
        holdings,
        transactions,
        exchangeRate,
        isLoading,
        setManualPrice,
        manualPrices
    } = usePortfolio();

    // Local state for view preferences
    const [currency, setCurrency] = useState<'THB' | 'USD'>(() => {
        return (localStorage.getItem('portfolio_currency') as 'THB' | 'USD') || 'THB';
    });

    // Persist currency change if we were to add a toggle here (future proofing)
    useEffect(() => {
        localStorage.setItem('portfolio_currency', currency);
    }, [currency]);

    // Find the specific holding
    // We need to account that ticker might be URL encoded or have special chars, though usually simple.
    const holding = holdings.find(h => h.ticker === ticker);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!holding) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
                <h2 className="text-xl font-bold mb-2">ไม่พบสินทรัพย์ {ticker}</h2>
                <p className="text-muted-foreground mb-4">อาจมีการลบสินทรัพย์นี้ไปแล้ว หรือชื่อไม่ถูกต้อง</p>
                <Button onClick={() => navigate('/')}>กลับหน้าหลัก</Button>
            </div>
        );
    }

    return (
        <HoldingDetailView
            holding={holding}
            transactions={transactions}
            exchangeRate={exchangeRate}
            currency={currency}
            onBack={() => navigate(-1)}
            showValue={true}
        />
    );
}
