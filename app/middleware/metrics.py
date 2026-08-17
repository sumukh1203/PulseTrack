import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware

# Initialize Prometheus metrics counters & histograms
REQUEST_COUNT = Counter(
    "pulsetrack_http_requests_total",
    "Total number of HTTP requests processed",
    ["method", "endpoint", "status"],
)
REQUEST_LATENCY = Histogram(
    "pulsetrack_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware capturing HTTP request volumes and processing latencies for Prometheus."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.url.path == "/metrics":
            return await call_next(request)

        start_time = time.perf_counter()

        # Manually resolve the matched route to avoid cardinality explosion with path IDs
        route = None
        for r in request.app.routes:
            match, _ = r.matches(request.scope)
            if match.name == "MATCH":
                route = r
                break

        endpoint = route.path if route else request.url.path
        status_code = 500

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as e:
            status_code = 500
            raise e
        finally:
            duration = time.perf_counter() - start_time
            REQUEST_COUNT.labels(
                method=request.method, endpoint=endpoint, status=status_code
            ).inc()
            REQUEST_LATENCY.labels(method=request.method, endpoint=endpoint).observe(
                duration
            )
