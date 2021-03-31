

const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();
const open = require('open');
const https = require('https');
const axios = require("axios");
require('dotenv').config({ path: __dirname+'/.env' });

const twilio = require('twilio');
const twilio_accountSid = process.env.TWILIO_ACCT_SID;
const twilio_authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio_Phone = process.env.TWILIO_PHONE;
const twilioClient = new twilio(twilio_accountSid, twilio_authToken);

var requests
var interval = 1000 * 60 * parseFloat(process.env.INTERVAL_MINUTES);	// 1000ms x 60s x 60m
var gkey = process.env.GOOGLE_KEY;
var url = "https://vaccinefinder.org/results/?";
    url += "&medications=784db609-dc1f-45a5-bad6-8db02e79d44f";
//    url += "medications=784db609-dc1f-45a5-bad6-8db02e79d44f,a84fb9ed-deb4-461c-b785-e17c782ef88b,779bfe52-0dd8-4023-a183-457eb100fccc";
    url += "&radius=50";
    url += "&zipcode=";
var hide_browser = (typeof process.env.HIDE_BROWSER == "undefined" || process.env.HIDE_BROWSER=="true") ? true : false;

var sendSMS = (phone, message) => {

	console.log("--------- SENDING SMS ----------");
	console.log(phone);
	console.log(message);
	console.log();
return;

    twilioClient.messages.create({
        body: message,
        to: phone,
        from: twilio_Phone
    })
    .then((message) => {
        console.log(message.sid)
    })
    .catch((err) => {
    	console.log(err)
    });

}


var attempt = async (page, zip) => {
    await page.goto(url+zip);    
    await page.waitForTimeout(1000);    
    var x = await page.evaluate(() => {
        var r = [];
        var items = document.querySelectorAll("#split-screen-content > main > div:nth-child(3) a");
        for (var i=0;i<items.length;i++) {
            var label = items[i].getAttribute("aria-label");
            var parts = label.split("\n");
            var item = {
                in_stock: (parts[0].substring(0,8)=="in stock")
                ,
                location: parts[1].trim().replace("located at", "").replace(/, +/g," ").trim()
            }
            if (item.in_stock) {
                r.push(item);
            }
//            r.push(label);
        }
        return r;
    });
    return x;
}

var scrape = async (zip) => {
    // -----------------------------------    
    // Set headless to false when testing:
    // -----------------------------------    
    let browser = await puppeteer.launch({headless: hide_browser
        , args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
    });
    // -----------------------------------    
    var locations = {};
    try {
        let page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4298.0 Safari/537.36');
        var zips = {"27612":true, "27513":true, "27530":true};
//        var zips = ["27510","27511","27512","27513","27514","27515","27516","27517","27518","27519"];
        for (var z in zips) {
            console.log("Checking ", z, "...");
            var stock = await attempt(page, z);
            for (var s in stock) {
                locations[stock[s].location] = true;
            }
        }
    } catch(er) { 
        console.log("er", er);
    }
    browser.close();
    return locations;
};

(async () => {
    var locs = await scrape();

    console.log(locs);
})();