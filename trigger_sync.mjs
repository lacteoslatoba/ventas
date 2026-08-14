import { chromium } from 'playwright';

const run = async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9335');
    const page = browser.contexts()[0].pages()[0];

    page.on('console', msg => console.log(`[${new Date().toISOString().slice(11,19)}][${msg.type()}]`, msg.text()));

    const clicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const target = buttons.find(b => b.textContent.includes('sin subir') || b.textContent.includes('Toca para sincronizar'));
        if (target) { target.click(); return 'banner'; }
        return null;
    });
    console.log('Clicked:', clicked);

    if (!clicked) {
        console.log('No pending banner found — nothing to sync, or already synced.');
    }

    await page.waitForTimeout(15000);

    const snap = await page.evaluate(() => {
        const raw = localStorage.getItem('ventas-quesos-storage');
        const s = JSON.parse(raw).state;
        const tables = ['products','users','clients','inventory','sales','expenses'];
        const pending = tables.reduce((acc,t)=>acc+(s[t]||[]).filter(i=>!i.synced).length,0);
        return { syncError: s.syncError, pending, isSyncing: s.isSyncing };
    });
    console.log('After trigger:', JSON.stringify(snap));

    await browser.close();
};

run().catch(err => { console.error('FAILED:', err.message); process.exit(1); });
