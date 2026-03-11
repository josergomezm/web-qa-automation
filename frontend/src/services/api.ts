import axios from 'axios'

let _baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'

export function setBaseUrl(url: string) {
  _baseUrl = url
}

export function getBaseUrl(): string {
  return _baseUrl
}

const api = {
  get<T = any>(path: string) {
    return axios.get<T>(`${_baseUrl}${path}`).then(r => r.data)
  },
  post<T = any>(path: string, data?: any) {
    return axios.post<T>(`${_baseUrl}${path}`, data).then(r => r.data)
  },
  patch<T = any>(path: string, data?: any) {
    return axios.patch<T>(`${_baseUrl}${path}`, data).then(r => r.data)
  },
  delete<T = any>(path: string) {
    return axios.delete<T>(`${_baseUrl}${path}`).then(r => r.data)
  }
}

export default api
