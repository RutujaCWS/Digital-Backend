const AuditLog = require('../models/AuditLog');

const audit = (action, resource) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      try {
        await AuditLog.create({
          user: req.user?.id,
          userName: req.user?.name,
          role: req.user?.role,
          action, resource,
          resourceId: req.params.id,
          details: { method: req.method, body: req.body },
          ip: req.ip
        });
      } catch (e) { /* silent */ }
    }
  });
  next();
};

module.exports = audit;