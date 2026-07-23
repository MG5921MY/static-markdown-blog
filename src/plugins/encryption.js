/**
 * 加密模块 — 密码管理工具
 */
const crypto = require('crypto');

/**
 * 生成随机密码
 * @param {number} length - 密码长度（默认 32）
 * @returns {string} 随机密码
 */
function generatePassword(length = 32) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[bytes[i] % charset.length];
  }
  return result;
}

/**
 * 计算密码哈希（用于前端验证，不是密码本身）
 * @param {string} password - 密码
 * @param {string} salt - 盐（站点名称）
 * @returns {string} SHA-256 哈希（hex）
 */
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

module.exports = { generatePassword, hashPassword };
