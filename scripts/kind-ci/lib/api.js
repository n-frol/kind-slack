const axios = require('axios');
const get = require('lodash/get');
const authenticate = require('../lib/authenticate');
const bmaut = require('../lib/bmaut');

module.exports = async ({
  clientId,
  clientPassword,
  method,
  contentType,
  endpoint,
  body,
  username,
  password,
  hostname
}) => {
  try {
    const token = await authenticate({clientId, clientPassword});
    //const token = await bmaut({clientId,clientPassword,username,password,hostname});

    let headers = {
      common: {
        authorization: `Bearer ${token}`
      }
    };

    if (contentType) {
      headers['content-type'] = contentType;
    }

    const {data} = await axios({
      url: endpoint,
      method,
      data: body,
      headers
    });

    return data;
  } catch (err) {
    return new Promise((resolve, reject) => {
      if (!err.response) {
        reject(new Error(err));
      } else if (
        err.response.status >= 400 &&
        get(err, 'response.data.fault.message')
      ) {
        reject(new Error(err.response.data.fault.message));
      } else if (get(err, 'response.data.error_description')) {
        reject(new Error(err.response.data.error_description));
      } else {
        reject(new Error(err));
      }
    });
  }
};