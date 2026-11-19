import { request, requestBlob } from './client';

const statusMessages = { 404: 'Không tìm thấy API nhập khóa học. Kiểm tra web đang kết nối với bản SportCenter-BE có chức năng nhập Excel.' };

const MAX_SIZE = 5 * 1024 * 1024;

export function validateCatalogFile(file) {
  if (!file || !/\.xlsx$/i.test(file.name)) throw new Error('Chọn tệp Excel .xlsx.');
  if (file.size > MAX_SIZE) throw new Error('Tệp tối đa 5 MB.');
}

/** CENTER_MANAGER: courses, learning paths, classes and lessons from one .xlsx. */
export const catalogImportApi = {
  /** → Blob of the template, with the current subjects and free coaches in the guide sheet. */
  template: token => requestBlob('/api/manager/catalog-import/template', token, { statusMessages }),
  /**
   * dryRun only validates. → { dryRun, valid, imported, summary: { courses, learningPaths, classes, lessons: { create, skip, error } },
   *   rows: [{ sheet, row, action: 'create'|'skip', label }], errors: [{ sheet, row, message }] }
   * Nothing is written when any row has an error.
   */
  run: (token, file, dryRun) => {
    validateCatalogFile(file);
    const formData = new FormData();
    formData.append('file', file, file.name);
    return request(`/api/manager/catalog-import${dryRun ? '?dryRun=1' : ''}`, { token, formData, timeoutMs: 120000, statusMessages });
  },
};
