/**
 * 加密模块 — AES-256-GCM 真加密
 * 
 * 安全保证：
 * - 密码永不写入 dist/
 * - 原始内容不写入 dist/
 * - 每篇文章独立随机 Salt + IV
 * - PBKDF2-SHA256 20万次迭代
 * - AES-256-GCM 认证加密（防篡改）
 */
const crypto = require('crypto');

const KDF_ITERATIONS = 200000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

/**
 * 从密码派生密钥
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, KDF_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * AES-256-GCM 加密
 * @param {string} content - 明文内容
 * @param {string} password - 密码
 * @returns {object} { salt, iv, ct, tag, v }
 */
function encryptContent(content, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(content, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 1,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64')
  };
}

/**
 * 生成随机密码
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
 * 计算密码哈希（仅用于登录门验证，不解密内容）
 */
function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

module.exports = { encryptContent, generatePassword, hashPassword };
