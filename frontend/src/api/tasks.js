import request from '../utils/request';

export function getTasks(data) {
  return request({
    url: '/tasks',
    method: 'post',
    data
  });
}

export function generateReport(data) {
  return request({
    url: '/report',
    method: 'post',
    data
  });
}
