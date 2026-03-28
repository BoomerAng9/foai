import { ACCESS_TOKEN } from '@/constants/auth'
import { getApiBaseUrl } from '@/lib/api-base-url'
import axios from 'axios'

const axiosInstance = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
})

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

axiosInstance.interceptors.response.use(
    (response) => {
        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem(ACCESS_TOKEN)
            // Don't redirect to login if we're on a share route
            if (!window.location.pathname.startsWith('/share/')) {
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export default axiosInstance
