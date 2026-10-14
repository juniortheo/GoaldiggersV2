const { dbRequest, requireConfig, response } = require('./_shared');

async function requireAdmin(event) {
  const token = (event.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token || !process.env.SUPABASE_ANON_KEY) return false;
  const authResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` },
  });
  if (!authResponse.ok) return false;
  const user = await authResponse.json();
  const profiles = await dbRequest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=role,active&limit=1`);
  return profiles?.[0]?.role === 'admin' && profiles[0].active === true;
}

exports.handler = async (event) => {
  try {
    requireConfig('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY');
    if (!await requireAdmin(event)) return response(403, { error: 'Administrator access required' });
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.action !== 'check-in' || !body.ticket_id) return response(400, { error: 'Unsupported admin action' });
      const tickets = await dbRequest(`tickets?id=eq.${encodeURIComponent(body.ticket_id)}&status=eq.successful&select=id,check_in_status&limit=1`);
      if (!tickets?.[0]) return response(404, { error: 'Paid ticket not found' });
      if (tickets[0].check_in_status) return response(409, { error: 'Ticket already checked in' });
      await dbRequest(`tickets?id=eq.${encodeURIComponent(body.ticket_id)}&status=eq.successful`, {
        method: 'PATCH', body: JSON.stringify({ check_in_status: true }),
      });
      return response(200, { checked_in: true });
    }
    if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
    const query = new URLSearchParams();
    Object.entries(event.queryStringParameters || {}).forEach(([key, value]) => query.set(key, value));
    const resource = query.get('resource') || 'donations';
    if (!['donations', 'tickets', 'subscriptions'].includes(resource)) return response(400, { error: 'Unsupported resource' });
    const sort = resource === 'subscriptions' ? 'started_at.desc' : 'created_at.desc';
    const baseFilters = new URLSearchParams({ select: '*', order: sort, limit: '1000' });
    const filterParams = new URLSearchParams();
    if (resource === 'donations') {
      if (query.has('status')) baseFilters.set('status', `eq.${query.get('status')}`);
      if (query.has('designation')) baseFilters.set('designation', `eq.${query.get('designation')}`);
      const dateConditions = [];
      if (query.has('from')) dateConditions.push(`created_at.gte.${query.get('from')}T00:00:00.000Z`);
      if (query.has('to')) dateConditions.push(`created_at.lte.${query.get('to')}T23:59:59.999Z`);
      if (dateConditions.length === 1) baseFilters.set('created_at', dateConditions[0].slice('created_at.'.length));
      if (dateConditions.length === 2) baseFilters.set('and', `(${dateConditions.join(',')})`);
    }
    const rows = [];
    for (let offset = 0; offset < 20000; offset += 1000) {
      const page = new URLSearchParams(baseFilters);
      page.set('offset', String(offset));
      const batch = await dbRequest(`${resource}?${page}`);
      rows.push(...(batch || []));
      if (!batch || batch.length < 1000) break;
    }
    if (resource === 'donations') {
      const totals = {};
      rows.forEach((row) => {
        if (row.status !== 'successful') return;
        const key = `${row.designation} (${row.currency})`;
        totals[key] = (totals[key] || 0) + Number(row.amount);
      });
      return response(200, { rows, totals });
    }
    return response(200, { rows });
  } catch (error) {
    console.error('admin-payments:', error.message);
    return response(500, { error: 'Could not load payment administration data' });
  }
};