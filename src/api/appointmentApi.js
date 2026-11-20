import { apiFetch } from './client';

export const appointmentApi = {
  getAllAppointments: async () => {
    const res = await apiFetch('/api/appointments');
    return Array.isArray(res) ? res : (res?.data || []);
  },
  getAppointmentById: (id) => apiFetch(`/api/appointments/${id}`),
  createAppointment: (data) => apiFetch('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAppointmentStatus: (id, updateData) => apiFetch(`/api/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(updateData)
  })
};

