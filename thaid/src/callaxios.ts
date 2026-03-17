import axios from 'axios'

// สำหรับ Log การทำงานของ REST Client (AXIOS)
axios.interceptors.request.use((config) => {
    console.log('')
    console.log('---------- AXIOS Request ----------')
    console.log(`[AXIOS] Method: [${config.method}]`)
    console.log(`[AXIOS] Endpoint: [${config.baseURL||config.url}]`)
    console.log(`[AXIOS] Header Authorization: [${config.headers['Authorization']}]`)
    console.log('[AXIOS] Body:', config.data)
    console.log('---------- AXIOS Request ----------')

    return config
}, (error) => {
    console.log('')
    console.log('---------- AXIOS Request ----------')
    console.error('[AXIOS] Error:', error)
    console.log('---------- AXIOS Request ----------')

    return Promise.reject(error)
})


axios.interceptors.response.use((response) => {
    console.log('---------- AXIOS Response ----------')
    console.log(`[AXIOS] HTTP Status: [${response.status} ${response.statusText}]`)
    console.log(`[AXIOS] Header Content-Type: [${response.headers['Content-Type']}]`)
    console.log('[AXIOS] Body:', response.data)
    console.log('---------- AXIOS Response ----------')
    console.log('')

    return response
}, (error) => {
    console.log('')
    console.log('---------- AXIOS Request ----------')
    console.error('[AXIOS] Error:', error)
    console.log('---------- AXIOS Request ----------')

    return Promise.reject(error)
})

export default axios
