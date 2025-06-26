// src/lib/services/directus-upload.js
import axios from 'axios';

const API_URL = 'https://directus.eltamaprimaindo.com';
const AUTH_TOKEN = 'JaXaSE93k24zq7T2-vZyu3lgNOUgP8fz';

export async function uploadDirectusFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${API_URL}/files`, formData, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data.id; // return file id
}
