const querystring = require('querystring');
const axios = require('axios');

module.exports = async ({clientId, clientPassword,username,password, hostname}) => {
  try {
    const url = `https://${hostname}/dw/oauth2/access_token?client_id=${clientId}`;
    const {data} = await axios.post(
      url,
      querystring.stringify({
        grant_type: 'urn:demandware:params:oauth:grant-type:client-id:dwsid:dwsecuretoken' // eslint-disable-line camelcase
      }),
      {
        auth: {
          username: username,
          password: `${password}:${clientPassword}`
        }
      }
    );
    return data.access_token;
  } catch (err) {
    return new Promise((resolve, reject) => reject(new Error(err)));
  }
};