require('dotenv').config({ path: __dirname+'/./.env' });
var SYSTEM_ID = process.argv[2];

require('dotenv').config({ path: __dirname+'/./.env' });

const mysql = require('mysql');
exports.con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DATABASE
});

exports.storeRecords = async (records) => {
    if (process.env.TESTING==0) {
        console.log("Actually saving!");
    }
    for (var i=0;i<records.length;i++) {
        if (process.env.TESTING==0) {
            this.con.query("insert into system_locations (system_id, label, address, phone) values (?,?,?,?)", [
                SYSTEM_ID, records[i].name, records[i].address, records[i].phone
            ], function (err, results, fields) {
                if (err) {
                    console.log(err);
                } else {
    //                console.log(results);
                }
            });
        }
        console.log("inserting", SYSTEM_ID, records[i]);
    }
}


