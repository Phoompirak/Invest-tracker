
const transactions = [
    { date: '2025-01-31', type: 'buy', shares: 0.2376, price: 126.25 },
    { date: '2025-03-27', type: 'sell', shares: 0.2371, price: 113.55 },
    { date: '2025-04-14', type: 'buy', shares: 0.2539, price: 112.02 },
    { date: '2025-10-16', type: 'sell', shares: 0.2530, price: 182.26 },
    { date: '2025-11-14', type: 'buy', shares: 0.2980, price: 188.67 },
    { date: '2025-11-21', type: 'sell', shares: 0.2970, price: 178.00 }, // PROBLEM HERE
];

let inventory = [];

for (const t of transactions) {
    console.log(`\nProcessing ${t.type.toUpperCase()} ${t.date}: ${t.shares} @ ${t.price}`);

    if (t.type === 'buy') {
        inventory.push({ ...t, remaining: t.shares });
        console.log(`Added to inventory. Total lots: ${inventory.length}`);
    } else {
        let sharesToSell = t.shares;
        let totalCost = 0;
        let soldLog = [];

        for (const lot of inventory) {
            if (sharesToSell <= 0) break;
            if (lot.remaining <= 0) continue;

            const taking = Math.min(lot.remaining, sharesToSell);
            totalCost += taking * lot.price;
            lot.remaining -= taking;
            sharesToSell -= taking;

            soldLog.push(`${taking.toFixed(4)} from lot ${lot.date} (@${lot.price})`);
        }

        const saleValue = t.shares * t.price;
        const profit = saleValue - totalCost;

        console.log('Sold items breakdown:');
        soldLog.forEach(l => console.log('  - ' + l));
        console.log(`Sale Value: ${saleValue.toFixed(2)}`);
        console.log(`Total Cost: ${totalCost.toFixed(2)}`);
        console.log(`Realized P/L: ${profit.toFixed(2)}`);
    }
}
