import { chromium } from 'playwright';

const run = async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9335');
    const page = browser.contexts()[0].pages()[0];

    page.on('console', msg => console.log(`[${new Date().toISOString().slice(11,19)}][${msg.type()}]`, msg.text()));
    page.on('pageerror', err => console.log('[pageerror]', err.message));

    const snapshot = async () => page.evaluate(() => {
        const raw = localStorage.getItem('ventas-quesos-storage');
        if (!raw) return null;
        const s = JSON.parse(raw).state;
        const tables = ['products','users','clients','inventory','sales','expenses'];
        const pending = tables.reduce((acc,t)=>acc+(s[t]||[]).filter(i=>!i.synced).length,0);
        return {
            isOnline: s.isOnline, isSyncing: s.isSyncing, syncError: s.syncError,
            pending,
            products: (s.products||[]).map(p => ({ id: p.id, name: p.name, stock: p.stock, synced: p.synced })),
        };
    });

    console.log('BEFORE:', JSON.stringify(await snapshot(), null, 2));
    console.log('\nWatching 40s for the test sale...\n');
    await page.waitForTimeout(40000);
    console.log('\nAFTER:', JSON.stringify(await snapshot(), null, 2));

    await browser.close();
};

run().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
