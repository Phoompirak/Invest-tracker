/**
 * =============================================================================
 *  Invest-Tracker: Portfolio Calculation Module
 * =============================================================================
 *  Purpose: รวมทุกฟังก์ชันคำนวณเกี่ยวกับพอร์ตหุ้นไว้ในไฟล์เดียว
 *           เพื่อความสะดวกในการตรวจสอบ/Debug/ส่งให้ AI วิเคราะห์
 * 
 *  Functions:
 *  - applySplits()        : ปรับข้อมูลย้อนหลังตามการแตกหุ้น
 *  - recalculateFIFO()    : คำนวณ Realized P/L ตามวิธี FIFO
 *  - calculateHoldings()  : คำนวณยอดถือครองสุทธิแต่ละหุ้น
 *  - calculateSummary()   : สรุปภาพรวมพอร์ตทั้งหมด
 * =============================================================================
 */

import { Transaction, Holding, PortfolioSummary, PortfolioCategory, StockSplit } from '@/types/portfolio';

// ============================================================================
//  Helper Functions
// ============================================================================

/** ฟังก์ชันแปลงเป็นตัวเลข ป้องกัน NaN */
const toNumber = (val: any): number => Number(val) || 0;

// ============================================================================
//  Type Definitions (for internal use)
// ============================================================================

/** ล็อตหุ้นสำหรับ FIFO Calculation */
interface Lot {
    id: string;
    shares: number;
    costPerShare: number;
    remaining: number;
}

// ============================================================================
//  1. APPLY STOCK SPLITS
// ============================================================================
/**
 * ปรับข้อมูล Transactions ย้อนหลังตามการแตกหุ้น
 * 
 * หลักการ:
 * - Stock Split เช่น 2:1 หมายความว่าหุ้น 1 หุ้นเดิม -> 2 หุ้นใหม่
 * - Ratio = 2 -> shares * 2, pricePerShare / 2
 * - เราจะปรับทุก Transaction ที่เกิด "ก่อน" วันที่แตกหุ้น (effectiveDate)
 * 
 * @param transactions - รายการ Transactions ทั้งหมด
 * @param splits - รายการ Stock Splits
 * @returns Transactions ที่ปรับปรุงตามการแตกหุ้นแล้ว (Deep Copy)
 * 
 * ตัวอย่าง:
 * - Transaction: ซื้อ 100 หุ้น @ 200 บาท (1 ม.ค. 2025)
 * - Stock Split: 2:1 มีผล 1 มิ.ย. 2025
 * - ผลลัพธ์: Transaction จะถูกปรับเป็น 200 หุ้น @ 100 บาท
 */
export function applySplits(transactions: Transaction[], splits: StockSplit[]): Transaction[] {
    if (!splits || splits.length === 0) return transactions;

    // Deep copy เพื่อไม่แก้ไขข้อมูลต้นฉบับ
    const adjusted = transactions.map(t => ({
        ...t,
        timestamp: new Date(t.timestamp)
    }));

    // เรียงลำดับ splits จากเก่าสุดก่อน (กรณีแตกหลายครั้ง)
    const sortedSplits = [...splits].sort((a, b) =>
        new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime()
    );

    // วนลูปแต่ละ Split
    for (const split of sortedSplits) {
        const splitDate = new Date(split.effectiveDate);
        const ratio = split.ratio;

        // ปรับ Transactions ที่เกิดก่อนวันแตกหุ้น
        for (const t of adjusted) {
            if (t.ticker === split.ticker && t.timestamp < splitDate) {
                // ปรับจำนวนหุ้นและราคา
                // ตัวอย่าง: Split 2:1, Ratio = 2
                //   เดิม: 10 หุ้น @ 100 บาท = 1000 บาท
                //   ใหม่: 20 หุ้น @ 50 บาท  = 1000 บาท (มูลค่าเท่าเดิม)
                t.shares = t.shares * ratio;
                t.pricePerShare = t.pricePerShare / ratio;
                // totalValue คงเดิม (หุ้น * ราคา ยังเท่าเดิม)
            }
        }
    }

    return adjusted;
}

// ============================================================================
//  2. FIFO CALCULATION
// ============================================================================
/**
 * คำนวณ Realized P/L ด้วยวิธี FIFO (First-In-First-Out)
 * 
 * หลักการ FIFO:
 * - เมื่อขายหุ้น จะตัดจากล็อตที่ซื้อเก่าสุดก่อน
 * - กำไร/ขาดทุน = (ราคาขาย - ต้นทุนของล็อตที่ถูกตัด) * จำนวนหุ้น
 * 
 * @param transactions - รายการ Transactions (ควรผ่าน applySplits มาก่อน)
 * @param splits - รายการ Stock Splits (จะถูกนำไปใช้ใน applySplits)
 * @returns Transactions ที่มีค่า realizedPL แล้ว
 * 
 * ตัวอย่าง:
 * 1. ซื้อ 100 หุ้น @ 10 บาท (ล็อต 1)
 * 2. ซื้อ 100 หุ้น @ 15 บาท (ล็อต 2)
 * 3. ขาย 120 หุ้น @ 20 บาท
 *    -> ตัดล็อต 1: 100 หุ้น, ต้นทุน 10 บาท
 *    -> ตัดล็อต 2: 20 หุ้น, ต้นทุน 15 บาท
 *    -> กำไร = (100 * (20-10)) + (20 * (20-15)) = 1000 + 100 = 1100 บาท
 */
export function recalculateFIFO(transactions: Transaction[], splits: StockSplit[] = []): Transaction[] {
    // Step 0: ปรับข้อมูลตาม Stock Splits ก่อน
    const adjustedTransactions = applySplits(transactions, splits);

    // Step 1: เรียงลำดับตามเวลา (เก่าสุดก่อน)
    const sorted = adjustedTransactions.sort((a, b) =>
        a.timestamp.getTime() - b.timestamp.getTime()
    );

    // Step 2: สร้าง Inventory สำหรับแต่ละ Ticker
    const inventoryByTicker = new Map<string, Lot[]>();

    // Step 3: วนลูปแต่ละ Transaction
    const updatedTransactions = sorted.map(t => {
        if (t.type === 'buy') {
            // ======================
            // BUY: เพิ่มเข้า Inventory
            // ======================
            // ต้นทุนต่อหุ้น = (มูลค่า + ค่าคอมมิชชั่น) / จำนวนหุ้น
            const costPerShare = (t.totalValue + t.commission) / t.shares;

            const tickerInventory = inventoryByTicker.get(t.ticker) || [];
            tickerInventory.push({
                id: t.id,
                shares: t.shares,
                costPerShare: costPerShare,
                remaining: t.shares
            });
            inventoryByTicker.set(t.ticker, tickerInventory);

            return t;

        } else if (t.type === 'sell') {
            // ======================
            // SELL: ตัดออกจาก Inventory (FIFO)
            // ======================
            let sharesToSell = t.shares;
            let totalCost = 0;

            const tickerInventory = inventoryByTicker.get(t.ticker) || [];

            // ตัดจากล็อตเก่าสุดก่อน
            for (const lot of tickerInventory) {
                if (sharesToSell <= 0.000001) break; // หมดแล้ว
                if (lot.remaining <= 0.000001) continue; // ล็อตนี้หมดแล้ว

                // หยิบหุ้นจากล็อตนี้
                const taking = Math.min(lot.remaining, sharesToSell);
                totalCost += taking * lot.costPerShare;

                lot.remaining -= taking;
                sharesToSell -= taking;
            }

            // คำนวณ P/L (ใช้ค่า Manual ถ้ามี, ถ้าไม่มีใช้ค่าจากการคำนวณ FIFO)
            const saleValue = t.shares * t.pricePerShare;
            const calculatedPL = saleValue - totalCost - t.commission;
            const realizedPL = t.manualRealizedPL !== undefined ? t.manualRealizedPL : calculatedPL;

            // คำนวณ P/L เป็น %
            let realizedPLPercent = 0;
            // Implied Cost = SaleValue - Profit - Commission
            const impliedCost = saleValue - realizedPL - t.commission;

            if (impliedCost > 0) {
                realizedPLPercent = (realizedPL / impliedCost) * 100;
            } else if (impliedCost === 0) {
                // กรณีต้นทุนเป็น 0 (เช่น หุ้นได้มาฟรี)
                realizedPLPercent = 100;
            }

            return {
                ...t,
                realizedPL,
                realizedPLPercent
            };
        }

        // DIVIDEND หรืออื่นๆ ไม่ต้องคำนวณ
        return t;
    });

    return updatedTransactions;
}

// ============================================================================
//  3. CALCULATE HOLDINGS
// ============================================================================
/**
 * คำนวณยอดถือครองสุทธิของแต่ละหุ้น
 * 
 * @param transactions - รายการ Transactions ทั้งหมด
 * @param currentPrices - ราคาปัจจุบันของแต่ละหุ้น (ticker -> price)
 * @param exchangeRate - อัตราแลกเปลี่ยน USD/THB
 * @param manualPrices - ราคาที่ใส่มือ (ถ้า API ไม่มี)
 * @returns Holding[] รายการหุ้นที่ถือ พร้อม Unrealized P/L
 */
export function calculateHoldings(
    transactions: Transaction[],
    currentPrices: Record<string, number> = {},
    exchangeRate: number = 34.5,
    manualPrices: Record<string, number> = {}
): Holding[] {
    const holdingsMap = new Map<string, { shares: number; totalCost: number; category: PortfolioCategory }>();

    // สะสมยอดจาก Transactions
    transactions.forEach(t => {
        // ข้าม Dividend (ไม่กระทบจำนวนหุ้น)
        if (t.type === 'dividend') return;

        const current = holdingsMap.get(t.ticker) || { shares: 0, totalCost: 0, category: t.category };

        // แปลงเป็น THB ถ้าเป็น USD
        const rate = t.currency === 'USD' ? (t.exchangeRate || exchangeRate) : 1;
        const transactionCost = toNumber(t.totalValue + t.commission) * rate;

        if (t.type === 'buy') {
            current.shares += toNumber(t.shares);
            current.totalCost += transactionCost;
        } else {
            // ลดต้นทุนตามสัดส่วน
            if (current.shares > 0) {
                const costPerShare = current.totalCost / current.shares;
                current.totalCost -= (costPerShare * toNumber(t.shares));
            }
            current.shares -= toNumber(t.shares);
        }

        current.category = t.category;
        holdingsMap.set(t.ticker, current);
    });

    // สร้าง Holding Objects
    return Array.from(holdingsMap.entries()).map(([ticker, data]) => {
        // ตรวจสอบว่าเป็น USD หรือไม่
        const isUsd = transactions.some(t => t.ticker === ticker && t.currency === 'USD');
        const rate = isUsd ? exchangeRate : 1;

        // ใช้ราคา API หรือ Manual
        const apiPrice = currentPrices[ticker] || 0;
        const manualPrice = manualPrices[ticker] || 0;
        const currentPrice = apiPrice > 0 ? apiPrice : manualPrice;
        const hasPriceData = currentPrice > 0;

        // ตรวจสอบ "ฝุ่น" (หุ้นที่เหลือน้อยมาก)
        const rawValue = data.shares * currentPrice;
        const isDust = hasPriceData && rawValue < 1 && rawValue > 0;

        const isClosed = data.shares <= 0.01 || isDust;
        const marketValue = isClosed ? 0 : data.shares * currentPrice * rate;
        const unrealizedPL = isClosed ? 0 : (hasPriceData ? marketValue - data.totalCost : 0);
        const unrealizedPLPercent = (data.totalCost > 0 && !isClosed && hasPriceData)
            ? (unrealizedPL / data.totalCost) * 100
            : 0;

        // Realized P/L รวมจากทุกการขาย
        const tickerRealizedPL = transactions
            .filter(t => t.ticker === ticker && t.type === 'sell' && t.realizedPL !== undefined)
            .reduce((sum, t) => {
                const txRate = t.currency === 'USD' ? exchangeRate : 1;
                return sum + (t.realizedPL || 0) * txRate;
            }, 0);

        return {
            ticker,
            totalShares: isClosed ? 0 : data.shares,
            averageCost: (data.shares > 0 && data.totalCost > 0) ? data.totalCost / data.shares : 0,
            totalInvested: isClosed ? 0 : data.totalCost,
            currentPrice,
            marketValue,
            unrealizedPL,
            unrealizedPLPercent,
            realizedPL: tickerRealizedPL,
            category: data.category,
            isClosed,
            hasPriceData,
        };
    });
}

// ============================================================================
//  4. CALCULATE SUMMARY
// ============================================================================
/**
 * สรุปภาพรวมพอร์ตทั้งหมด
 * 
 * @param holdings - รายการ Holdings จาก calculateHoldings()
 * @param transactions - รายการ Transactions ทั้งหมด
 * @param exchangeRate - อัตราแลกเปลี่ยน USD/THB
 * @returns PortfolioSummary ข้อมูลสรุป
 */
export function calculateSummary(
    holdings: Holding[],
    transactions: Transaction[],
    exchangeRate: number = 34.5
): PortfolioSummary {
    const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
    const totalInvested = holdings.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalUnrealizedPL = holdings.reduce((sum, h) => sum + h.unrealizedPL, 0);

    // Realized P/L รวมจากทุกการขาย
    const totalRealizedPL = transactions
        .filter(t => t.type === 'sell' && t.realizedPL !== undefined)
        .reduce((sum, t) => {
            const rate = t.currency === 'USD' ? exchangeRate : 1;
            return sum + (t.realizedPL || 0) * rate;
        }, 0);

    // เงินปันผลรวม (หักภาษี ณ ที่จ่าย)
    const totalDividends = transactions
        .filter(t => t.type === 'dividend')
        .reduce((sum, t) => {
            const rate = t.currency === 'USD' ? exchangeRate : 1;
            return sum + (t.totalValue - (t.withholdingTax || 0)) * rate;
        }, 0);

    const totalPL = totalRealizedPL + totalUnrealizedPL + totalDividends;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

    // หา Best/Worst Performer
    const sortedByPL = [...holdings].sort((a, b) => b.unrealizedPLPercent - a.unrealizedPLPercent);

    return {
        totalValue,
        totalInvested,
        totalRealizedPL,
        totalUnrealizedPL,
        totalDividends,
        totalPL,
        totalPLPercent,
        bestPerformer: sortedByPL[0] || null,
        worstPerformer: sortedByPL[sortedByPL.length - 1] || null,
    };
}

// ============================================================================
//  5. UTILITY FUNCTIONS
// ============================================================================

/**
 * ตัด Transactions ซ้ำซ้อน (Deduplication) โดยใช้ ID เป็นหลัก
 * 
 * ⚠️ สำคัญ: ใช้ ID เป็น Primary Key เพราะ:
 * 1. ID ควรไม่ซ้ำกัน (เป็น Timestamp หรือ UUID)
 * 2. ถ้ามี ID เดียวกันซ้ำหลายบรรทัด แสดงว่ามีบั๊กในการบันทึก
 * 3. เก็บเฉพาะตัวแรกที่เจอ (อันหลังทิ้ง)
 * 
 * @param transactions - รายการ Transactions
 * @returns Object containing unique transactions and duplicate IDs
 */
export function deduplicateTransactions(transactions: Transaction[]): {
    unique: Transaction[];
    duplicateIds: string[];
} {
    const seenIds = new Set<string>();
    const duplicateIds: string[] = [];

    const unique = transactions.filter(t => {
        if (seenIds.has(t.id)) {
            duplicateIds.push(t.id);
            return false; // เจอ ID ซ้ำ ให้ดีดทิ้ง
        }
        seenIds.add(t.id);
        return true; // ข้อมูลใหม่ เก็บไว้
    });

    if (duplicateIds.length > 0) {
        console.warn(`🐛 Deduplication: Removed ${duplicateIds.length} duplicate transactions by ID`);
        console.warn('Duplicate IDs:', duplicateIds.slice(0, 10)); // Log first 10
    }

    return { unique, duplicateIds };
}

/**
 * ล้างค่า realizedPL ออกก่อนส่งไปคำนวณใหม่
 * 
 * ⚠️ สำคัญ: ต้องทำก่อนส่งเข้า Worker เพื่อให้ Worker คำนวณใหม่ตั้งแต่ต้น
 *           ไม่ใช้ค่าเก่าที่อาจผิดพลาด (เช่น ต้นทุน 0)
 * 
 * @param transactions - รายการ Transactions
 * @returns รายการที่ยังไม่มี realizedPL
 */
export function stripRealizedPL(transactions: Transaction[]): Transaction[] {
    return transactions.map(t => {
        if (t.type === 'sell') {
            // ลบค่าเก่าออก ไม่ใช้ realizedPL และ realizedPLPercent
            const { realizedPL, realizedPLPercent, ...rest } = t;
            return rest as Transaction;
        }
        return t;
    });
}

/**
 * กรอง Transactions ตามเงื่อนไข
 */
export interface FilterOptions {
    ticker?: string;
    type?: 'buy' | 'sell' | 'dividend';
    category?: string;
    profitOnly?: boolean;
    lossOnly?: boolean;
    startDate?: Date;
    endDate?: Date;
}

export function filterTransactions(transactions: Transaction[], filters: FilterOptions): Transaction[] {
    return transactions.filter(t => {
        if (filters.ticker && t.ticker !== filters.ticker) return false;
        if (filters.type && t.type !== filters.type) return false;
        if (filters.category && t.category !== filters.category) return false;
        if (filters.profitOnly && t.type === 'sell' && (t.realizedPL || 0) <= 0) return false;
        if (filters.lossOnly && t.type === 'sell' && (t.realizedPL || 0) >= 0) return false;
        if (filters.startDate && new Date(t.timestamp) < filters.startDate) return false;
        if (filters.endDate && new Date(t.timestamp) > filters.endDate) return false;
        return true;
    });
}
