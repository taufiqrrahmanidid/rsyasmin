// backend/__tests__/security.test.js
// Unit test untuk kontrol keamanan inti: RBAC & PatientAuth middleware.
// Tidak membutuhkan koneksi DB.

// Set JWT_SECRET SEBELUM middleware di-require (rbac membaca env saat load).
process.env.JWT_SECRET = 'test-secret-00000000000000000000000000000000';

const jwt = require('jsonwebtoken');
const { requireAuth, requireRole, requirePermission } = require('../middlewares/rbac');
const { requirePatientAuth } = require('../middlewares/patientAuth');

function mockReq({ authorization, cookies = {} } = {}) {
  const headers = authorization ? { authorization } : {};
  return { headers, cookies };
}

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('RBAC — requireAuth', () => {
  test('menolak request tanpa token (401)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('menolak token tidak valid (401)', () => {
    const req = mockReq({ authorization: 'Bearer invalid-token' });
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('menerima token valid & menyuntik req.admin', () => {
    const token = jwt.sign({ id: 'u1', email: 'a@b.c', role: 'Master', permissions: [] }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.admin.role).toBe('Master');
  });

  test('mendukung auth via cookie httpOnly', () => {
    const token = jwt.sign({ id: 'u1', role: 'SuperUser' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = mockReq({ cookies: { access_token: token } });
    const res = mockRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('RBAC — requireRole & requirePermission', () => {
  test('requireRole menolak role tidak cukup (403)', () => {
    const req = { admin: { role: 'User' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('Master', 'SuperUser')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('requireRole mengizinkan role yang cocok', () => {
    const req = { admin: { role: 'SuperUser' } };
    const res = mockRes();
    const next = jest.fn();
    requireRole('Master', 'SuperUser')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('requirePermission: Master bypass semua', () => {
    const req = { admin: { role: 'Master', permissions: [] } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('MENU_PENDAFTARAN')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('requirePermission menolak tanpa permission (403)', () => {
    const req = { admin: { role: 'User', permissions: ['MENU_ARTICLES'] } };
    const res = mockRes();
    const next = jest.fn();
    requirePermission('MENU_PENDAFTARAN')(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('PatientAuth — requirePatientAuth', () => {
  test('menolak token tanpa kind:patient (401)', () => {
    const token = jwt.sign({ kind: 'admin', nik: 'x' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();
    requirePatientAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  test('menerima token patient & menyuntik req.patient', () => {
    const token = jwt.sign({ kind: 'patient', nik: '1234567890123456', phone: '0812' }, process.env.JWT_SECRET, { algorithm: 'HS256' });
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    const next = jest.fn();
    requirePatientAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.patient.nik).toBe('1234567890123456');
  });

  test('menolak tanpa header Authorization (401)', () => {
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();
    requirePatientAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
