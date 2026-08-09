from playwright.sync_api import sync_playwright

page_errors = []
request_errors = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    page.on('pageerror', lambda err: page_errors.append(err.message))
    page.on('requestfailed', lambda request: request_errors.append(request.url + ' :: ' + request.failure.get('message') if request.failure else request.url))

    page.goto('https://r2-quiz.vercel.app/host.html', wait_until='load', timeout=15000)
    page.locator('#btnCrearSala').click()
    page.wait_for_timeout(2500)

    setup_state = ''
    setup_el_count = page.locator('#setupEstado').count()
    if setup_el_count:
        setup_state = page.locator('#setupEstado').text_content().strip()

    visible_panel = 'none'
    panels = page.locator('section.panel')
    for i in range(panels.count()):
        panel = panels.nth(i)
        if 'hidden' not in panel.evaluate("element => element.className"):
            visible_panel = panel.evaluate("element => element.id")
            break

    codigo_html = page.locator('#codigoSala').evaluate("element => element.innerHTML")
    codigo_text = page.locator('#codigoSala').text_content().strip()

    print({
        'setup_state': setup_state,
        'visible_panel': visible_panel,
        'codigo_html': codigo_html,
        'codigo_text': codigo_text,
        'page_errors': page_errors,
        'request_errors': request_errors,
    })

    browser.close()
