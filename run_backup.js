

const puppeteer = require('puppeteer');
const fs = require("fs");
const { Parser } = require('json2csv');
const parser = new Parser();
const open = require('open');
const https = require('https');
require('dotenv').config({ path: __dirname+'/.env' });

const axios = require("axios");
const twilio = require('twilio');
const twilio_accountSid = process.env.TWILIO_ACCT_SID;
const twilio_authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = new twilio(twilio_accountSid, twilio_authToken);
const myPhones = process.env.MY_PHONES;
const max_seconds = process.env.MAX_SECONDS;

var requests
var interval = 1000 * 60 * parseFloat(process.env.INTERVAL_MINUTES);	// 1000ms x 60s x 60m
var gkey = process.env.GOOGLE_KEY;
var url = "https://www.unchealthcare.org/coronavirus/vaccines/phase-1b-covid-19-vaccine/";
var hide_browser = (typeof process.env.HIDE_BROWSER == "undefined" || process.env.HIDE_BROWSER=="true") ? true : false;

var sendSMS = (phone, message) => {

	console.log(phone, message);

	/*
    twilioClient.messages.create({
        body: message,
        to: phone,
        from: '+13239243830'
    })
    .then((message) => {
        `console`.log(message.sid)
    })
    .catch();
    */

}

var sendPackage = (package) => {
	var message = package.message + " ";

	//// ----------------------------------------------------------------
	//// 
	//// ----------------------------------------------------------------
	var avs = [];
	for (var i in package.items) {
		if (package.items[i].seconds < max_seconds) {
			avs.push(package.items[i].destination + " (" + package.items[i].minutes + " minutes)");
		}
	}
	if (avs.length > 0) {
		message += avs.join(", ");
		message += " " + url;
		var phones = myPhones.split(',');
		for (var p in phones) {
			console.log(phones[p]);
			console.log(message);
			console.log("---------------------");
			sendSMS(phones[p], message);
		}
	//	open('https://www.unchealthcare.org/coronavirus/vaccines/phase-1b-covid-19-vaccine/');	
	} else {
		console.log("No appointments within " + max_seconds + " seconds");
//		setTimeout(scrape, interval);
	}
	//// ----------------------------------------------------------------


}

var packageDistance = async (url, origin, destination, package) => {
	var url = "https://maps.googleapis.com/maps/api/distancematrix/json?key="+gkey+"&origins="+origin+"&destinations="+destination;

//	console.log("gurl:", url);

	//// axios Version:
	/*
	axios.get(url).then(response => {
        let json = response.data;
        var route = origin + " TO " + destination;
        package.items[route] = {
        	destination:destination
        	,
        	seconds:json.rows[0].elements[0].duration.value
        	,
        	minutes:Math.round(parseInt(json.rows[0].elements[0].duration.value)/60)
        }
        if (Object.keys(package.items).length >= package.count) {
        	sendPackage(package);
        }
	})
	.catch(error => {
		console.log("ERROR", error);
	});
	*/

	//// https version
	var x = await https.get(url,(res) => {
	    let body = "";
	    res.on("data", (chunk) => {
	        body += chunk;
	    });
	    res.on("end", () => {
	        try {
	            let json = JSON.parse(body);
	            var route = origin + " TO " + destination;
	            package.items[route] = {
	            	destination:destination
	            	,
	            	seconds:json.rows[0].elements[0].duration.value
	            	,
	            	minutes:Math.round(parseInt(json.rows[0].elements[0].duration.value)/60)
	            }
	            if (Object.keys(package.items).length >= package.count) {
	            	sendPackage(package);
	            }
	        } catch (error) {
	            console.error("ERROR: " + error.message);
	        };
	    });
	}).on("error", (error) => {
	    console.error("ERROR", error.message);
	});


}
var cb = function() {
	console.log("Callback!!");
};



var attempt = async (browser, page) => {
	await page.goto(url);
	await page.waitForTimeout(2000);
	console.log("Checking at ", (new Date()) )
	var x = await page.evaluate(() => {
		var r = {};
		r.found = false;
		r.continue = true;
		var h = document.querySelector("#PageContent .cmsPageContent h3");
		if (  (!h || h==null) ) { // || h.innerText.trim()!="We’re very sorry, but all vaccine appointments have been scheduled.") {
			r.found = true;
			r.continue = false;
			document.querySelector("#FormField29_497cba67-54b2-428e-979f-e045e5fb82dc").style.display = "block";
		} else {
		}
		return r;
	});

	//// ----------------------------------------
	//// --- TO RUN A REAL ADDRESS LOOKUP -------
	//// ----------------------------------------
	if (x.found) {
		await page.click("#FormField29_497cba67-54b2-428e-979f-e045e5fb82dc a");
		await page.waitForTimeout(2000);
		await page.reload();
		await page.click(".Accordion .Trigger span");
		await page.waitForTimeout(2000);
		var iframeURLs = [];
		var iframeURL = await page.evaluate(() => {
			//// Look for first block (Moderna and Pfizer)
			iframe = document.querySelector(".Accordion .Payload > iframe");
			if (iframe!=null) {
				return iframe.src;
			}
			return false;
		});
		if (!!iframeURL) {
			iframeURLs.push({
				msg:"Moderna and Pfizer Vaccinations Available!"
				,
				url:iframeURL
			});
		}
		/*
		var iframeURL = await page.evaluate(() => {
			//// Look for 2nd block (for J&J Instead)
			var iframe;
			iframe = document.querySelectorAll(".Accordion .Payload > iframe");
			if (iframe!=null) {
				return iframe.src;
			}
		});
		if (!!iframeURL) {
			iframeURLs.push({
				msg:"Johnson and Johnson Vaccinations Available!"
				,
				url:iframeURL
			});
		}
		*/

		if (iframeURLs.length > 0) {

			for (var i in iframeURLs) {
				iframeURL = iframeURLs[i];
//				console.log("iframe url: ", iframeURL.url);

				await page.goto(iframeURL.url);
//				await page.waitForTimeout(1000);
				await page.waitForSelector(".scrollTableWrapper .departmentAddress");
//				console.log("button available!");
				var addresses = await page.evaluate(() => {
					var addies = document.querySelectorAll(".scrollTableWrapper .departmentAddress");
					var r = [];
					for (var a=0;a<addies.length;a++) {
						r.push(addies[a].innerText);
					}
					return r;
				});
				for (var a in addresses) {
//					console.log("address: ", addresses[a]);
				}

				var package = { message:iframeURL.msg, count:0, items:{} }
				var stretches = {};
				for (var a in addresses) {
					stretches[addresses[a]] = {
						origin:"Chapel Hill NC", destination:addresses[a]
					};
				}
				package.count = Object.keys(stretches).length;
				for (var s in stretches) {
					packageDistance(url, stretches[s].origin, stretches[s].destination, package);
				}


			}

		}
//		await page.waitForTimeout(1000000);
//		browser.close();
	}
	//// ----------------------------------------

	return x;
}


var scrape = async () => {
// -----------------------------------    
// Set headless to false when testing:
// -----------------------------------    
	let browser = await puppeteer.launch({headless: hide_browser, args: ['--no-sandbox', '--disable-setuid-sandbox']});
// -----------------------------------    
	let page = await browser.newPage();
	var x = await attempt(browser, page);

	////-----------------------------------------------
	//// Run nonstop until manually quitting for now
	////-----------------------------------------------
	if (true || x.continue) {
		setTimeout(scrape, interval);
	}
	////-----------------------------------------------
	browser.close();
	return x;
};

scrape();


