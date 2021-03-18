

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
var interval = 1000 * 60 * parseInt(process.env.INTERVAL_MINUTES);	// 1000ms x 60s x 60m
var gkey = process.env.GOOGLE_KEY;
var url = "https://www.unchealthcare.org/coronavirus/vaccines/phase-1b-covid-19-vaccine/";



/*
var url = "https://maps.googleapis.com/maps/api/geocode/json?address=Chapel+Hill+NC&key="+process.env.GOOGLE_KEY;
console.log(url);
axios.get(url)
  .then(response => {
    console.log(response.data.results[0].geometry.location);
  })
  .catch(error => {
    console.log(error);
  });
*/

