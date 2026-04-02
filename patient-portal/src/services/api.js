import axios from 'axios';

const API_BASE = "http://" + (typeof window !== 'undefined' ? window.location.hostname : 'localhost') + ":8000/portal";

const api = axios.create({
  baseURL: API_BASE,
});

export const getDoctors = async () => {
  const response = await api.get('/doctors');
  return response.data;
};

export const getDoctorReviews = async (doctorId) => {
  const response = await api.get(`/doctors/${doctorId}/reviews`);
  return response.data;
};

export const bookAppointment = async (data) => {
  const response = await api.post('/appointments', data);
  return response.data;
};

export const leaveReview = async (data) => {
  const response = await api.post('/reviews', data);
  return response.data;
};

export const findPatient = async (identifier) => {
  const response = await api.get(`/patients/find?identifier=${identifier}`);
  return response.data;
};

export const registerPatient = async (data) => {
  const response = await api.post('/patients/register', data);
  return response.data;
};

export const getPatientAppointments = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/appointments`);
  return response.data;
};

export const getPatientVisits = async (patientId) => {
  const response = await api.get(`/patients/${patientId}/visits`);
  return response.data;
};

export default api;
