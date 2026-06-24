import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 20 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3000';

export default function () {
  group('首页加载', function () {
    const res = http.get(`${BASE_URL}/`);
    check(res, { '首页状态码': (r) => r.status === 200 });
  });

  sleep(2);

  group('API - 产品列表', function () {
    const res = http.get(`${BASE_URL}/api/products`);
    check(res, { '产品列表状态码': (r) => r.status === 200 });
  });

  sleep(1);

  group('API - 销售统计', function () {
    const res = http.get(`${BASE_URL}/api/sales/stats`);
    check(res, { '销售统计状态码': (r) => r.status === 200 });
  });

  sleep(1);

  group('API - 库存查询', function () {
    const res = http.get(`${BASE_URL}/api/inventory`);
    check(res, { '库存查询状态码': (r) => r.status === 200 });
  });

  sleep(1);

  group('API - 财务概览', function () {
    const res = http.get(`${BASE_URL}/api/finance/overview`);
    check(res, { '财务概览状态码': (r) => r.status === 200 });
  });

  sleep(2);
}
