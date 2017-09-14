const express = require('express');
const app = express();
const multipart = require('connect-multiparty');
const multipartMiddleware = multipart();
const tools = require('./tools');
const path = require('path');
const async = require('async');

app.post('/upload', multipartMiddleware, function(req, res) {
	console.log(req.body, req.files);
	if (!req.files.file) {
		return tools.sendErr(res);
	}
	let file = req.files.file;
	async.waterfall([
		function(callback) {
			tools.fileSha(file.path, (err, hash) => {
				return callback(err, hash);
			});
		},
		function(hash, callback) {
			let newPath = path.join(__dirname, 'public/img/uploads', hash);
			tools.moveFile(file.path, newPath, (err, data) => {
				return callback(err, hash);
			});
		}
	], function(err, result) {
		if (err) {
			return tools.sendErr(res, err);
		}
		return res.json({
			success: true,
			hash: result
		});
	});
	//TODO: don't forget to delete all req.files when done

});

app.use(express.static('public'));

app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});