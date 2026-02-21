const app = require('../server');

module.exports = (req, res) => {
	req.url = '/create-checkout-session';
	return app(req, res);
};
