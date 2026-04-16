import axios from 'axios';

const API_BASE = "https://" + (typeof window !== 'undefined' ? window.location.hostname : 'localhost') + ":8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchNurses = async () => {
  try {
    const response = await api.get('/users?role_name=Nurse');
    return response.data;
  } catch (error) {
    console.error('Error fetching nurses:', error);
    throw error;
  }
};

export const fetchQueue = async () => {
  try {
    const response = await api.get('/queue');
    return response.data;
  } catch (error) {
    console.error('Error fetching queue:', error);
    throw error;
  }
};

export const fetchStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

export const callNextPatient = async (roomNumber, doctorId, patientId = null) => {
  try {
    const response = await api.post('/call-next', {
      room_number: roomNumber,
      doctor_id: doctorId,
      patient_id: patientId
    });
    return response.data;
  } catch (error) {
    console.error('Error calling next patient:', error);
    throw error;
  }
};

export const completePatient = async (patientId) => {
  try {
    const response = await api.post(`/complete/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error completing patient:', error);
    throw error;
  }
};

export const fetchRecommendedPatient = async (roomNumber, doctorId) => {
  try {
    const response = await api.get('/queue/recommend', {
      params: { room_number: roomNumber, doctor_id: doctorId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching recommendation:', error);
    throw error;
  }
};

export const skipPatient = async (patientId) => {
  try {
    const response = await api.post(`/queue/skip/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error skipping patient:', error);
    throw error;
  }
};

export const undoPatientStatus = async (patientId) => {
  try {
    const response = await api.post(`/queue/undo/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error undoing patient status:', error);
    throw error;
  }
};

export const fetchActiveCounters = async () => {
  try {
    const response = await api.get('/queue/counters');
    return response.data;
  } catch (error) {
    console.error('Error fetching active counters:', error);
    throw error;
  }
};

export const fetchAllPatients = async () => {
  try {
    const response = await api.get('/patients-all');
    return response.data;
  } catch (error) {
    console.error('Error fetching all patients:', error);
    throw error;
  }
};

export const fetchPatientDetail = async (patientId) => {

  try {
    const response = await api.get(`/patients/${patientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient details:', error);
    throw error;
  }
};

export const fetchPatientVisits = async (patientId) => {
  try {
    const response = await api.get(`/portal/patients/${patientId}/visits`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient visits:', error);
    throw error;
  }
};

export default api;



export const createObservationNote = async (patientId, content, nurseId) => {
  try {
    const response = await api.post(`/patients/${patientId}/observation-notes`, {
      patient_id: patientId,
      content,
      nurse_id: nurseId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating observation note:', error);
    throw error;
  }
};

export const fetchObservationNotes = async (patientId) => {
  try {
    const response = await api.get(`/patients/${patientId}/observation-notes`);
    return response.data;
  } catch (error) {
    console.error('Error fetching observation notes:', error);
    throw error;
  }
};

export const administerMedication = async (patientId, medData) => {
  try {
    const response = await api.post(`/patients/${patientId}/medications`, {
      ...medData,
      patient_id: patientId
    });
    return response.data;
  } catch (error) {
    console.error('Error administering medication:', error);
    throw error;
  }
};

export const fetchMedications = async (patientId) => {
  try {
    const response = await api.get(`/patients/${patientId}/medications`);
    return response.data;
  } catch (error) {
    console.error('Error fetching medications:', error);
    throw error;
  }
};

export const fetchMySchedule = async (userId) => {
  try {
    const response = await api.get(`/roster/my-schedule`, {
      params: { user_id: userId } // We usually use token, but for this portal we might need to send it if backend expects it
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule:', error);
    throw error;
  }
};

export const updateUserRoom = async (userId, roomNumber) => {
  try {
    const response = await api.put(`/users/${userId}/room`, {
      room_number: roomNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
};

export const uploadUserProfilePicture = async (userId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post(`/users/${userId}/profile-picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw error;
  }
};

export const fetchPatientVitals = async (patientId) => {
  try {
    const response = await api.get(`/patients/${patientId}/vitals`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    throw error;
  }
};

export const recordPatientVitals = async (patientId, vitalsData) => {
  try {
    const response = await api.post(`/patients/${patientId}/vitals`, vitalsData);
    return response.data;
  } catch (error) {
    console.error('Error recording patient vitals:', error);
    throw error;
  }
};

export const analyzeVitalsAI = async (currentVitals, history) => {
  try {
    const ai_api = axios.create({ baseURL: "https://" + (typeof window !== 'undefined' ? window.location.hostname : 'localhost') + ":8001/api/v1" });
    const response = await ai_api.post('/clinical/analyze_vitals', {
      current_vitals: currentVitals,
      history: history
    });
    return response.data;
  } catch (error) {
    console.warn('AI Clinical analysis unavailable', error);
    return null;
  }
};

export const checkAllergyAI = async (medicationName, patientAllergies) => {
  try {
    const ai_api = axios.create({ baseURL: "https://" + (typeof window !== 'undefined' ? window.location.hostname : 'localhost') + ":8001/api/v1" });
    const response = await ai_api.post('/clinical/check_allergy', {
      medication_name: medicationName,
      patient_allergies: patientAllergies
    });
    return response.data;
  } catch (error) {
    console.warn('AI Allergy check unavailable', error);
    return null;
  }
};

export const fetchNurseLogs = async (nurseId) => {
  try {
    const response = await api.get(`/nurses/${nurseId}/logs`);
    return response.data;
  } catch (error) {
    console.error('Error fetching nurse logs:', error);
    throw error;
  }
};

export const fetchNotifications = async (limit = 100, type = null) => {
  try {
    const params = { limit };
    if (type) params.type = type;
    const response = await api.get('/notifications', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

export const markNotificationRead = async (notifId) => {
  try {
    const response = await api.put(`/notifications/${notifId}/read`);
    return response.data;
  } catch (error) {
    console.error('Error marking notification read:', error);
    throw error;
  }
};

export const fetchConsumables = async () => {
  try {
    const response = await api.get('/consumables');
    return response.data;
  } catch (error) {
    console.error('Error fetching consumables:', error);
    throw error;
  }
};

export const createPatientCharge = async (patientId, chargeData) => {
  try {
    const response = await api.post(`/patients/${patientId}/charges`, chargeData);
    return response.data;
  } catch (error) {
    console.error('Error creating patient charge:', error);
    throw error;
  }
};

export const fetchPatientCharges = async (patientId) => {
  try {
    const response = await api.get(`/patients/${patientId}/charges`);
    return response.data;
  } catch (error) {
    console.error('Error fetching patient charges:', error);
    throw error;
  }
};

export const saveClinicalSheet = async (patientId, sheetData) => {
  try {
    const response = await api.post(`/patients/${patientId}/clinical-sheet`, sheetData);
    return response.data;
  } catch (error) {
    console.error('Error saving clinical sheet:', error);
    throw error;
  }
};

export const fetchClinicalSheet = async (patientId, params = {}) => {
  try {
    const response = await api.get(`/patients/${patientId}/clinical-sheet`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching clinical sheet:', error);
    throw error;
  }
};
