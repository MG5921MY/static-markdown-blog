/**
 * 认证插件 — 构建时处理密码管理
 * 
 * 功能：
 * - 管理密码（用户配置 / 自动生成）
 * - 生成密码验证哈希
 */
const fs = require('fs');
const path = require('path');
const { generatePassword, hashPassword } = require('./encryption');

const AUTH_KEY_FILE = '.auth-key';

/**
 * 认证插件主函数
 * @param {object} buildResult - 构建结果
 * @returns {object} { file, count }
 */
module.exports = function authPlugin(buildResult) {
  const { config, siteRoot } = buildResult;
  const authConfig = config.auth || {};
  
  if (!authConfig.enabled) {
    return { file: 'auth', count: 0 };
  }
  
  // 获取密码：配置 > .auth-key 文件 > 自动生成
  let password = authConfig.password || '';
  
  if (!password) {
    const keyPath = path.join(siteRoot, AUTH_KEY_FILE);
    
    if (fs.existsSync(keyPath)) {
      password = fs.readFileSync(keyPath, 'utf8').trim();
      console.log(`[AUTH] 使用已有密钥: ${AUTH_KEY_FILE}`);
    } else {
      password = generatePassword(32);
      fs.writeFileSync(keyPath, password, 'utf8');
      console.log(`[AUTH] 自动生成密钥: ${password}`);
      console.log(`[AUTH] 已保存到: ${keyPath}`);
    }
  } else {
    console.log(`[AUTH] 使用配置密码`);
  }
  
  const siteName = config.site?.name || 'Blog';
  const passwordHash = hashPassword(password, siteName);
  
  // 将认证信息写入 buildResult，供 static-copy 插件使用
  buildResult._auth = {
    enabled: true,
    password,
    passwordHash,
    sessionTtl: authConfig.session?.ttl ?? 7200
  };
  
  console.log(`[AUTH] 会话过期: ${authConfig.session?.ttl === -1 ? '永不过期' : (authConfig.session?.ttl || 7200) + '秒'}`);
  
  return { file: 'auth', count: 1 };
};
