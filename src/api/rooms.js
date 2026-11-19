import { request, enc } from './client';

const body = input => Object.fromEntries(
  ['roomNumber', 'name', 'capacity', 'status'].filter(key => input[key] !== undefined).map(key => [key, input[key]]),
);

export const roomsApi = {
  list: token => request('/api/rooms', { token }),
  get: (token, id) => request(`/api/rooms/${enc(id)}`, { token }),
  create: (token, input) => request('/api/rooms', { token, body: body(input) }),
  update: (token, id, input) => request(`/api/rooms/${enc(id)}`, { token, method: 'PUT', body: body(input) }),
  remove: (token, id) => request(`/api/rooms/${enc(id)}`, { token, method: 'DELETE' }),
};
