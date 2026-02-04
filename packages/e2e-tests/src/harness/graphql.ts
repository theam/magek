export interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export const graphqlRequest = async <T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<GraphQLResponse<T>> => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  })

  const text = await response.text()
  if (!text) {
    throw new Error(`Empty response from ${endpoint}`)
  }

  try {
    return JSON.parse(text) as GraphQLResponse<T>
  } catch {
    throw new Error(`Invalid JSON response from ${endpoint}: ${text}`)
  }
}
