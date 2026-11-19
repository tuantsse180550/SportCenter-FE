import { request } from './client';

const MAX_SIZE = 5 * 1024 * 1024;

export function validateScheduleFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name)) throw new Error('Chọn tệp Excel .xlsx.');
  if (file.size > MAX_SIZE) throw new Error('Tệp tối đa 5 MB.');
}

/** @param {File} file from <input type="file"> → { totalRows, successCount, errorCount, errors: [{ row, message }] } */
export function importSchedules(token, file) {
  validateScheduleFile(file);
  const formData = new FormData();
  formData.append('file', file, file.name);
  return request('/api/schedules/import', {
    token, formData, timeoutMs: 120000,
    statusMessages: { 404: 'Không tìm thấy API nhập lịch. Kiểm tra địa chỉ và phiên bản SportCenter-BE.' },
  });
}
