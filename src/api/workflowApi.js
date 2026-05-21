import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
})

export const workflowApi = {
  getState: async () => {
    const { data } = await client.get('/state')
    return data
  },
  createWorkflow: async (payload) => {
    const { data } = await client.post('/workflows', payload)
    return data
  },
  startWorkflow: async (id) => {
    const { data } = await client.post(`/workflows/${id}/start`)
    return data
  },
  decideWorkflow: async (id, payload) => {
    const { data } = await client.post(`/workflows/${id}/decision`, payload)
    return data
  },
  saveCriteria: async (payload) => {
    const { data } = await client.post('/criteria', payload)
    return data
  },
  deleteCriteria: async (id) => {
    await client.delete(`/criteria/${id}`)
  },
  resetDemo: async () => {
    const { data } = await client.post('/reset-demo')
    return data
  },
}
