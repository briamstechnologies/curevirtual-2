/**
 * scheduleService.js — API integration for Doctor Schedules
 */

import api from './api';

export const getDoctorSchedule = async (doctorId) => {
  const res = await api.get(`/schedule?doctorId=${doctorId}`);
  return res.data?.data || [];
};

export const createScheduleSlot = async (slotData) => {
  const res = await api.post('/schedule', slotData);
  return res.data?.data;
};

export const updateScheduleSlot = async (id, slotData) => {
  const res = await api.patch(`/schedule/${id}`, slotData);
  return res.data?.data;
};

export const deleteScheduleSlot = async (id) => {
  await api.delete(`/schedule/${id}`);
};

export default {
  getDoctorSchedule,
  createScheduleSlot,
  updateScheduleSlot,
  deleteScheduleSlot,
};
