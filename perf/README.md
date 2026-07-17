# Performance budgets

**Lighthouse** runs in CI over the built PWA shell (static, no API):
resource budgets error the build, category scores warn at 0.9 except
accessibility, which blocks. Budgets live in `budgets.json` — raise them
consciously, in a commit that says why.

**k6** exercises the API read paths against a running, seeded instance —
not in CI, since it needs real data:

```sh
docker run --rm -i -e BASE=http://host.docker.internal:8080 \
  grafana/k6 run - < perf/k6-api.js
```

Thresholds: p95 under 300 ms, error rate under 1%.
