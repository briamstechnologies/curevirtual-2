const { RtcTokenBuilder, RtcRole } = require('agora-token');
require('dotenv').config();


/**
 * Generate Agora RTC Token
 * @param {string} channelName - The name of the channel to join
 * @param {number|string} uid - The user ID. 0 means allow Agora to assign one.
 * @param {number} role - RtcRole.PUBLISHER or RtcRole.SUBSCRIBER
 * @param {number} expireTime - Token expiration time in seconds (e.g., 3600 for 1 hour)
 */
function generateAgoraToken(channelName, uid = 0, role = RtcRole.PUBLISHER, expireTime = 3600) {
  const APP_ID = process.env.AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error(`Missing AGORA_APP_ID or AGORA_APP_CERTIFICATE in environment variables. (ID=${APP_ID ? 'found' : 'missing'})`);
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTime;

  let token;
  if (typeof uid === 'string') {
    token = RtcTokenBuilder.buildTokenWithUserAccount(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
  } else {
    token = RtcTokenBuilder.buildTokenWithUid(APP_ID, APP_CERTIFICATE, channelName, uid, role, privilegeExpiredTs);
  }

  return token;
}

module.exports = {
  generateAgoraToken,
  RtcRole
};
