var mysql = require('mysql')
let $dbConfig = require('./dbConfig')
var connection = mysql.createConnection($dbConfig);

let data;

connection.connect();


connection.query(`SELECT post_title,post_content from 'wp_posts' where post_status = 'publish' and post_type = 'post';`, function (error, results, fields) {

  data = results

});


connection.end();


module.exports = data