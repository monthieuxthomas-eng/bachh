const app = require('../server');

module.exports = (req, res) => {
	req.url = '/verify-payment';
	return app(req, res);
};
