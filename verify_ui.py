import asyncio
from playwright.async_api import async_playwright
import sys

async def audit_design(url):
    print(f"--- UI/UX Pro Max Audit: {url} ---")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_with_context(viewport={'width': 1280, 'height': 800})
        await page.goto(url)
        
        # 1. Typography Check
        fonts = await page.evaluate("""() => {
            const elements = document.querySelectorAll('h1, h2, h3, p');
            const usedFonts = new Set();
            elements.forEach(el => usedFonts.add(window.getComputedStyle(el).fontFamily));
            return Array.from(usedFonts);
        }""")
        print(f"\n[Typography] Detected Fonts: {', '.join(fonts)}")
        if not any("Grotesk" in f or "Fredoka" in f for f in fonts):
            print("⚠️ Warning: Premium Heading Fonts (Space Grotesk/Fredoka) not detected.")

        # 2. Motion Easing Check (Implicit via CSS)
        easings = await page.evaluate("""() => {
            const elements = document.querySelectorAll('*');
            const usedTransitions = [];
            elements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.transitionTimingFunction !== 'ease' && style.transitionDuration !== '0s') {
                    usedTransitions.push(style.transitionTimingFunction);
                }
            });
            return Array.from(new Set(usedTransitions));
        }""")
        print(f"[Motion] Detected Easings: {', '.join(easings)}")
        if not any("0.4, 0, 0.2, 1" in e for e in easings):
             print("⚠️ Warning: Standard Pro Max Easing (cubic-bezier(0.4, 0, 0.2, 1)) not detected.")

        # 3. Accessibility (Contrast)
        # Simplified check for body text
        contrast = await page.evaluate("""() => {
            const body = document.body;
            const style = window.getComputedStyle(body);
            return { bg: style.backgroundColor, text: style.color };
        }""")
        print(f"[A11y] Root Colors: BG {contrast['bg']}, Text {contrast['text']}")

        await browser.close()
        print("\nAudit Complete.")

if __name__ == "__main__":
    target_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    asyncio.run(audit_design(target_url))
