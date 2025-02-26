// import axios from 'axios'
// import { useEffect, useState } from 'react'
// import { Alert, Platform } from 'react-native'


// export const ADDRESS = Platform.OS === 'ios'
//  	? 'localhost:8000'
// 	: "1fff-103-55-63-46.ngrok-free.app"

// const api = axios.create({
	
// 	baseURL: 'https://' + ADDRESS,
// 	headers: {
// 		'Content-Type': 'application/json'
// 	}
// })

// export default api


import axios from 'axios';
import { Platform } from 'react-native';
import secure from './secure'; // Import secure to access tokens
import utils from './utils';

export const ADDRESS = Platform.OS === 'ios'
  ? 'localhost:8000'
  : '038c-103-55-63-46.ngrok-free.app';

const api = async ({ method, url, data, headers = {} }) => {
  try {
    // Retrieve tokens from secure storage
    const tokens = await secure.get('tokens');
    if (tokens?.access) {
      headers.Authorization = `Bearer ${tokens.access}`;
    }

    const response = await axios({
      method,
      url: `https://${ADDRESS}${url}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers, // Merge any additional headers passed in the request
      },
    });

    return response;
  } catch (error) {
    utils.log(`API request failed: ${method} ${url}`, error);
    if (error.response?.status === 401) {
      throw new Error('Unauthorized: Invalid or missing token');
    }
    throw error;
  }
};

export default api;
