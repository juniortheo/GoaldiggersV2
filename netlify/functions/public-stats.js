const { dbRequest, response } = require('./_shared');

exports.handler = async () => {
  try {
    const rows = await dbRequest('public_donation_stats?select=*&limit=1');
    return response(200, rows?.[0] || { total_rwf: 0, total_usd: 0, donor_count: 0 });
  } catch (error) {
    console.error('public-stats:', error.message);
    return response(503, { error: 'Fundraising totals are temporarily unavailable' });
  }
};