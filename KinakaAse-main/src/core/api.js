import axios from 'axios'
import { useEffect, useState } from 'react'
import { Alert, Platform } from 'react-native'


export const ADDRESS = Platform.OS === 'ios'
 	? 'localhost:8000'
	: "bee5-103-55-63-46.ngrok-free.app"

const api = axios.create({
	
	baseURL: 'https://' + ADDRESS,
	headers: {
		'Content-Type': 'application/json'
	}
})

export default api
