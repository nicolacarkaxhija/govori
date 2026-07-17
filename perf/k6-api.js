/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';

// Load profile for the read paths a busy demo day would hit.
//   docker run --rm -i -e BASE=http://host.docker.internal:8080 \
//     grafana/k6 run - < perf/k6-api.js
export const options = {
  stages: [
    { duration: '15s', target: 20 },
    { duration: '30s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<300'],
  },
};

const base = __ENV.BASE || 'http://localhost:8080';

export function setup() {
  const course = http.get(`${base}/course`).json();
  const lessonId = course.units[0].lessons[0].id;
  return { lessonId };
}

export default function run(data) {
  check(http.get(`${base}/health`), { 'health ok': (r) => r.status === 200 });
  check(http.get(`${base}/items?limit=20`), {
    'items ok': (r) => r.status === 200,
  });
  check(http.get(`${base}/course`), { 'course ok': (r) => r.status === 200 });
  check(http.get(`${base}/lessons/${data.lessonId}`), {
    'lesson ok': (r) => r.status === 200,
  });
  check(http.get(`${base}/lessons/${data.lessonId}/sentences`), {
    'sentences ok': (r) => r.status === 200,
  });
  check(http.get(`${base}/stats`), { 'stats ok': (r) => r.status === 200 });
  sleep(1);
}
