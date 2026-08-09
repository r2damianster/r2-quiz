from playwright.sync_api import sync_playwright

page_errors = []
request_errors = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch()
    host_page = browser.new_page(viewport={"width": 1280, "height": 900})
    player_page = browser.new_page(viewport={"width": 720, "height": 900})

    host_page.on('pageerror', lambda err: page_errors.append(err.message))
    host_page.on('requestfailed', lambda request: request_errors.append(request.url + ' :: ' + request.failure.get('message') if request.failure else request.url))
    player_page.on('pageerror', lambda err: page_errors.append(err.message))
    player_page.on('requestfailed', lambda request: request_errors.append(request.url + ' :: ' + request.failure.get('message') if request.failure else request.url))

    host_page.goto('https://r2-quiz.vercel.app/host.html', wait_until='load', timeout=15000)
    host_page.locator('#btnCrearSala').click()
    host_page.wait_for_timeout(3500)

    room_code = host_page.locator('#codigoSala').text_content().strip()
    if not room_code:
        print({'status': 'host_no_code', 'visible_panel': host_page.locator('section.panel:not(.hidden)').evaluate("element => element.id") })
        browser.close()
        raise SystemExit(1)

    player_page.goto('https://r2-quiz.vercel.app/player.html', wait_until='load', timeout=15000)
    player_page.locator('#codigoSala').fill(room_code)
    player_page.locator('#nombreJugador').fill('Ana')
    player_page.locator('#generoJugador').select_option('mujer')
    player_page.locator('#btnUnirse').click()

    player_page.wait_for_timeout(3500)
    host_page.wait_for_timeout(1500)

    host_players_text = host_page.locator('#contadorJugadores').text_content().strip()
    player_status = player_page.locator('#pantalla-esperando').evaluate("element => element.className") if player_page.locator('#pantalla-esperando').count() else 'not_found'

    print({
        'room_code': room_code,
        'host_visible_panel': host_page.locator('section.panel:not(.hidden)').evaluate("element => element.id"),
        'host_player_count': host_players_text,
        'player_status': player_status,
        'page_errors': page_errors,
        'request_errors': request_errors,
    })

    browser.close()
