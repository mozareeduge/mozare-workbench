from __future__ import annotations
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PROTO = ROOT / "prototype"

def no_horizontal_overflow(page):
    return page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")

def load_prototype(page):
    html=(PROTO/"index.html").read_text(encoding="utf-8")
    html=html.replace('<link rel="stylesheet" href="assets/prototype.css" />','')
    html=html.replace('<script src="assets/prototype.js"></script>','')
    tokens=(ROOT/"UI/design-tokens.css").read_text(encoding="utf-8")
    css=(PROTO/"assets/prototype.css").read_text(encoding="utf-8")
    css='\n'.join(line for line in css.splitlines() if not line.startswith('@import'))
    js=(PROTO/"assets/prototype.js").read_text(encoding="utf-8")
    page.set_content(html,wait_until="domcontentloaded")
    page.add_style_tag(content=tokens+"\n"+css)
    page.add_script_tag(content=js)
    page.wait_for_timeout(40)

def main() -> int:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path="/usr/bin/chromium",args=["--no-sandbox"])
        page=browser.new_page(viewport={"width":1440,"height":900})
        load_prototype(page)
        assert page.locator("#focus").is_visible()
        assert "visible constraint" in page.locator("#focus h1").inner_text().lower()
        assert no_horizontal_overflow(page)
        assert page.locator(".rail").is_visible()
        assert not page.locator(".mobile-nav").is_visible()
        # v0.3 representation layer: stable orientation is zero-model; adaptive reference remains usable.
        page.locator('[data-rep="compare"]').click()
        assert "adaptive comparison" in page.locator("#dynamicFocus").inner_text().lower()
        page.locator('[data-rep="system"]').click()
        assert "system view" in page.locator("#dynamicFocus").inner_text().lower()
        page.locator('[data-rep="orient"]').click()
        assert "0 model tokens" in page.locator("#repRoute").inner_text()

        page.locator("#openMission").click()
        assert page.locator("#missionSheet").is_visible()
        assert "Acceptance" in page.locator("#missionSheet").inner_text()
        assert "Claude Code" in page.locator("#missionSheet").inner_text()
        page.keyboard.press("Escape")
        assert not page.locator("#missionSheet").is_visible()

        page.locator('.rail [data-view="field"]').click()
        assert page.locator("#field").is_visible()
        page.locator(".field-node.current").click()
        assert page.locator("#drawer").is_visible()
        assert "relation object" in page.locator("#drawer").inner_text().lower()
        page.keyboard.press("Escape")
        assert not page.locator("#drawer").is_visible()

        page.locator('.rail [data-view="review"]').click()
        assert page.locator("#review").is_visible()
        assert page.locator(".review-item").count()==2
        detail=page.locator("#reviewDetail").inner_text().lower()
        assert "requested outcome" in detail and "verification" in detail and "implementation detail" in detail
        assert "7 observed tests passed" in detail
        page.locator('[data-review="wording"]').click()
        assert "owner language decision" in page.locator("#reviewDetail").inner_text().lower()
        page.locator('[data-review="interaction"]').click()

        page.locator('.rail [data-view="output"]').click()
        out=page.locator("#output").inner_text().lower()
        assert "canonical / editable" in out and "generated / distributable" in out and "observed" in out
        page.locator('.rail [data-view="focus"]').click()
        desktop_shot=PROTO/"prototype-qa-desktop.png"
        page.screenshot(path=str(desktop_shot),full_page=True)

        mobile=browser.new_page(viewport={"width":390,"height":844})
        load_prototype(mobile)
        assert mobile.locator(".mobile-nav").is_visible()
        assert not mobile.locator(".rail").is_visible()
        assert mobile.locator(".mobile-nav [data-view]").count()==5
        assert no_horizontal_overflow(mobile)
        mobile.locator('.mobile-nav [data-view="review"]').click()
        assert mobile.locator("#review").is_visible()
        assert no_horizontal_overflow(mobile)
        mobile_shot=PROTO/"prototype-qa-mobile.png"
        mobile.screenshot(path=str(mobile_shot),full_page=True)

        narrow=browser.new_page(viewport={"width":320,"height":700})
        load_prototype(narrow)
        assert no_horizontal_overflow(narrow)
        narrow.locator("#openMission").click()
        assert narrow.locator("#missionSheet").is_visible()
        assert no_horizontal_overflow(narrow)
        assert narrow.locator("#startMission").is_visible()
        browser.close()
    print("PROTOTYPE E2E: PASS")
    print(f"desktop screenshot: {desktop_shot.relative_to(ROOT)}")
    print(f"mobile screenshot: {mobile_shot.relative_to(ROOT)}")
    return 0

if __name__=="__main__": raise SystemExit(main())
