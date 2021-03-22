
require('dotenv').config({ path: __dirname+'/.env' });

const twilio = require('twilio');
const twilio_accountSid = process.env.TWILIO_ACCT_SID;
const twilio_authToken = process.env.TWILIO_AUTH_TOKEN;
const twilio_Phone = process.env.TWILIO_PHONE;
const twilioClient = new twilio(twilio_accountSid, twilio_authToken);


var sendSMS = (phone, message) => {
	console.log("--------- SENDING SMS ----------");
	console.log(phone);
	console.log(message);
	console.log();
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

//sendSMS('+18126060589', 'Test from Jon! Let me know at my normal number if you get it?');
//sendSMS('+18123278766', 'Test from Jon! Let me know at my normal number if you get it?');