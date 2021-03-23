

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
const twilio_Phone = process.env.TWILIO_PHONE;
const twilioClient = new twilio(twilio_accountSid, twilio_authToken);

var requests
var interval = 1000 * 60 * parseFloat(process.env.INTERVAL_MINUTES);	// 1000ms x 60s x 60m
var gkey = process.env.GOOGLE_KEY;
var url = "https://www.walgreens.com/findcare/vaccination/covid-19?ban=covid_vaccine_landing_schedule";
var hide_browser = (typeof process.env.HIDE_BROWSER == "undefined" || process.env.HIDE_BROWSER=="true") ? true : false;

var sendSMS = (phone, message) => {

	console.log("--------- SENDING SMS ----------");
	console.log(phone);
	console.log(message);
	console.log();
//return;

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

var sendPackage = (package) => {

	var sentAny = false;
	for (var c in clients) {
//		console.log("client:", clients[c]);
		var msgs = [];
		for (var v in package.vaccines) {
//			console.log("vaccine", package.vaccines[v]);
			var adds = [];
			for (var a in package.vaccines[v].addresses) {
//				console.log("address", package.vaccines[v].addresses[a]);
				var addr = package.vaccines[v].addresses[a];
				var route = clients[c].location + " TO " + addr;
				var seconds = package.distances[route].seconds;
				var minutes = Math.ceil(parseInt(seconds)/60);
				if (seconds < clients[c].seconds) {
					adds.push(addr + " (" + minutes + " minutes)");
				}
			}
			if (adds.length > 0) {
				msgs.push(package.vaccines[v].msg + " \n" + adds.join(" \n"));
			}
		}
		if (msgs.length > 0) {
			sentAny = true;
			msgs.unshift(clients[c].name+"!");
			sendSMS(clients[c].phone, msgs.join(" \n"));
		}
	}
	if (!sentAny) {
		console.log("No alerts found.");
	}

	/*
	var message = package.message + " ";
	//// ----------------------------------------------------------------
	//// 
	//// ----------------------------------------------------------------
	var avs = [];
	for (var i in package.distances) {
		if (package.distances[i].seconds < max_seconds) {
			avs.push(package.distances[i].destination + " (" + package.distances[i].minutes + " minutes)");
		}
	}
	if (avs.length > 0) {
		message += avs.join(", ");
		message += " " + url;
		for (var c in clients) {
			sendSMS(clients[c].phone, message);
		}
	//	open('https://www.unchealthcare.org/coronavirus/vaccines/phase-1b-covid-19-vaccine/');	
	} else {
		console.log("No appointments within " + max_seconds + " seconds");
//		setTimeout(scrape, interval);
	}
	//// ----------------------------------------------------------------
	*/

}



var packageDistance = async (origin, destination, package) => {

	if (typeof routes[origin] == "undefined") {
		routes[origin] = {};
	}
	if (typeof routes[origin][destination]=="undefined") {
		routes[origin][destination] = {};
		//// Fetch distance from Google
		var url = "https://maps.googleapis.com/maps/api/distancematrix/json?key="+gkey+"&origins="+origin+"&destinations="+destination;
		axios.get(url).then(response => {
	        let json = response.data;
	        var route = origin + " TO " + destination;
	        var seconds = json.rows[0].elements[0].duration.value;
	        routes[origin][destination].seconds = seconds;
	        package.distances[route] = {
	        	destination:destination
	        	,
	        	seconds:seconds
	        	,
	        	minutes:Math.round(parseInt(seconds)/60)
	        }
			//// Write new distance data to cache:
			let data = JSON.stringify(routes);
			fs.writeFileSync('routes.json', data);
	        if (Object.keys(package.distances).length >= package.count) {
	        	sendPackage(package);
	        }
		})
		.catch(error => {
			console.log("ERROR", error);
		});
	} else {
		//// Use the cached distance data:
        var route = origin + " TO " + destination;
        package.distances[route] = {
        	destination:destination
        	,
        	seconds:routes[origin][destination].seconds
        	,
        	minutes:Math.round(parseInt(routes[origin][destination].seconds)/60)
        }
        if (Object.keys(package.distances).length >= package.count) {
        	sendPackage(package);
        }		
	}

}
var cb = function() {
	console.log("Callback!!");
};



var attempt = async (browser, page) => {

	try {

		console.log("Checking Walgreens at ", (new Date()) )
		var zips = ['27410'];
		for (var z in zips) {
			await page.goto(url);
			await page.waitForTimeout(1000);
			await page.click("#userOptionButtons a");
			await page.waitForSelector("#inputLocation");
			await page.waitForTimeout(1000);
			await page.evaluate( () => document.getElementById("inputLocation").value = "");
			await page.type("#inputLocation", zips[z]);
			await page.click("#wag-body-main-container button");
		}
		await page.waitForTimeout(10000);			
			/*
			//// Generate fake address results:
			var x = {continue:true};
			var vaccines = {};
			vaccines["MP"] = {
				msg:"Moderna and Pfizer Vaccinations Available!"
				,
				addresses:[
					"2 Holly Crest Ct., Greensboro, NC 27410"
					,
					"100 Airport Road, Kinston, NC 28501"				
				]
			};
			vaccines["JJ"] = {
				msg:"Johnson and Johnson Vaccinations Available!"
				,
				addresses:[
					"101 E. Weaver Street, Carrboro, NC 27510"
					,
					"100 Airport Road, Kinston, NC 28501"
				]
			};
			*/
			/*
			//// 
			//// Prepare array of unique driving stretches
			var stretches = {};
			for (var c in clients) {
				var cloc = clients[c].location;
				stretches[cloc] = {};
				for (var v in vaccines) {
					for (var a in vaccines[v].addresses) {
						var vloc = vaccines[v].addresses[a];
						stretches[cloc][vloc] = {
							origin:cloc, destination:vloc
						};						
					}
				}
			}
			var stretchCount = 0;
			for (var c in stretches) {
				for (var v in stretches[c]) {
					stretchCount++;
				}
			}

			//// Prepare a package to process after all locations are handled
			var package = { vaccines:vaccines, count:0, distances:{} }
			package.count = stretchCount;
			for (var a in stretches) {
				for (var b in stretches[a]) {
					packageDistance(stretches[a][b].origin, stretches[a][b].destination, package);
				}
			}
			*/

	} catch(err) { console.log("er:", err); }

	//// ----------------------------------------

	return x;
}


var scrape = async () => {
	// -----------------------------------    
	// Set headless to false when testing:
	// -----------------------------------    
	let browser = await puppeteer.launch({headless: hide_browser, args: ['--no-sandbox', '--disable-setuid-sandbox']});
	// -----------------------------------    
	try {		
		let page = await browser.newPage();
		var x = await attempt(browser, page);
	} catch(er) { 
		console.log("er", er);
	}
	////-----------------------------------------------
	//// Run nonstop until manually quitting for now
	////-----------------------------------------------
	console.log("Continuing shortly...");
	setTimeout(scrape, interval);
	////-----------------------------------------------
	browser.close();
	return x;
};




// Get info about the clients subscribed:
var rawdata = fs.readFileSync('clients.json');
var clients = JSON.parse(rawdata);
//console.log("clients:", clients);

// Get a distinct list of their city/state locations:
var origins = {};
for (var c in clients) {
	origins[clients[c].location] = clients[c].location;
}
origins = Object.keys(origins);
//console.log("origins:", origins);

var rawdata = fs.readFileSync("routes.json");
var routes = JSON.parse(rawdata);
//console.log("routes:", routes);

scrape();


