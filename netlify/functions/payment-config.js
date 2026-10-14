const { requireConfig, response } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  try {
    requireConfig('FLW_PUBLIC_KEY');
    return response(200, { publicKey: process.env.FLW_PUBLIC_KEY });
  } catch (error) {
    return response(503, { error: error.message });
  }
};