const db = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Middleware to log all sensitive operations
 */
const auditLogger = (req, res, next) => {
  // Skip logging for non-sensitive endpoints
  const sensitiveMethods = ['POST', 'PUT', 'DELETE'];
  const sensitivePaths = ['/api/auth/change-password', '/api/users', '/api/employees'];
  
  const isSensitive = sensitiveMethods.includes(req.method) || 
                     sensitivePaths.some(path => req.path.startsWith(path));
  
  if (!isSensitive) {
    return next();
  }

  // Log the operation
  const auditLog = {
    userId: req.user?.id || null,
    action: `${req.method} ${req.path}`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || '',
    method: req.method,
    path: req.path,
    params: JSON.stringify(req.params),
    query: JSON.stringify(req.query),
    body: req.body && Object.keys(req.body).length > 0 
      ? JSON.stringify(redactSensitiveData(req.body)) 
      : null,
    statusCode: null,
    responseTime: null,
    error: null
  };

  // Store start time
  const startTime = Date.now();

  // Override res.json to capture response data
  const originalJson = res.json;
  res.json = function(data) {
    // Calculate response time
    auditLog.responseTime = Date.now() - startTime;
    auditLog.statusCode = res.statusCode;
    
    // Log error if present
    if (data && data.status === 'error') {
      auditLog.error = data.message || 'Unknown error';
    }
    
    // Save audit log to database
    saveAuditLog(auditLog).catch(err => {
      logger.error('Failed to save audit log:', err);
    });
    
    // Call original json method
    return originalJson.call(this, data);
  };

  // Handle errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      auditLog.statusCode = res.statusCode;
      auditLog.error = res.statusMessage || 'Unknown error';
      auditLog.responseTime = Date.now() - startTime;
      
      saveAuditLog(auditLog).catch(err => {
        logger.error('Failed to save error audit log:', err);
      });
    }
  });

  next();
};

/**
 * Save audit log to database
 */
async function saveAuditLog(log) {
  try {
    await db.run(
      `INSERT INTO audit_logs 
       (user_id, action, ip_address, user_agent, method, path, 
        params, query, request_body, status_code, response_time, error)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.userId,
        log.action,
        log.ip,
        log.userAgent,
        log.method,
        log.path,
        log.params,
        log.query,
        log.body,
        log.statusCode,
        log.responseTime,
        log.error
      ]
    );
  } catch (error) {
    logger.error('Error saving audit log:', error);
    throw error;
  }
}

/**
 * Redact sensitive information from request body
 */
function redactSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = [
    'password', 'newPassword', 'confirmPassword', 'token', 'refreshToken',
    'creditCard', 'cvv', 'ssn', 'apiKey', 'secret'
  ];
  
  const result = Array.isArray(obj) ? [] : {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      result[key] = '***REDACTED***';
    } else if (value && typeof value === 'object') {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

module.exports = auditLogger;
