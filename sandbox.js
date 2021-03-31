

const puppeteer = require('puppeteer');
(async() => {
    let browser = await puppeteer.launch({headless: true
        , args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
    });
    var page = (await browser.pages())[0];
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36');
    var response = await page.goto('http://scooterlabs.com/echo.json');
    console.log(await response.json());
    await browser.close();
})()

//sendSMS('+18126060589', 'Test from Jon! Let me know at my normal number if you get it?');
//sendSMS('+18123278766', 'Test from Jon! Let me know at my normal number if you get it?');