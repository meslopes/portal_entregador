# Alerta minimo (hardening): uptime check + alerta de 5xx no Cloud Monitoring
# via REST API (o gcloud CLI local nao tem o componente beta de canais).
import json
import os
import subprocess
import urllib.error
import urllib.request

PROJECT = "project-0799c4fd-82a2-49a0-b7d"
PROJECT_NUM = "890250693883"
HOST = "muvlog-api-890250693883.us-central1.run.app"
EMAIL = "meslopes@gmail.com"

token = subprocess.check_output(
    ["gcloud.cmd", "auth", "print-access-token"], text=True).strip()


def api(method, path, payload=None):
    req = urllib.request.Request(
        f"https://monitoring.googleapis.com/v3/projects/{PROJECT_NUM}{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"ERRO {method} {path}: {e.code} {body[:400]}")
        raise


# 1) Uptime check no /api/health (a cada 1 min, HTTPS)
uptime = api("POST", "/uptimeCheckConfigs", {
    "displayName": "muvlog-api /api/health",
    "monitoredResource": {
        "type": "uptime_url",
        "labels": {"project_id": PROJECT, "host": HOST},
    },
    "httpCheck": {
        "path": "/api/health",
        "port": 443,
        "requestMethod": "GET",
        "useSsl": True,
        "acceptedResponseStatusCodes": [{"statusClass": "STATUS_CLASS_2XX"}],
    },
    "timeout": "10s",
    "period": "60s",
})
uptime_name = uptime["name"]
print("uptime check:", uptime_name)

# 2) Canal de notificacao por e-mail
canal = api("POST", "/notificationChannels", {
    "type": "email",
    "displayName": f"Email {EMAIL}",
    "description": "Alertas de monitoramento muvlog-api",
    "labels": {"email_address": EMAIL},
})
canal_name = canal["name"]
print("canal:", canal_name)

# 3) Politica de alerta: uptime falhou OU 5xx no Cloud Run
politica = api("POST", "/alertPolicies", {
    "displayName": "muvlog-api: fora do ar ou erro 5xx",
    "combiner": "OR",
    "conditions": [
        {
            "displayName": "Uptime check do /api/health falhou",
            "conditionThreshold": {
                "filter": (
                    'metric.type="monitoring.googleapis.com/uptime_check/check_passed" '
                    'resource.type="uptime_url" '
                    f'resource.label.host="{HOST}"'
                ),
                "comparison": "COMPARISON_GT",
                "thresholdValue": 1,
                "duration": "120s",
                "aggregations": [{
                    "alignmentPeriod": "120s",
                    "perSeriesAligner": "ALIGN_NEXT_OLDER",
                    "crossSeriesReducer": "REDUCE_COUNT_FALSE",
                    "groupByFields": ["resource.*"],
                }],
                "trigger": {"count": 1},
            },
        },
        {
            "displayName": "Cloud Run respondendo 5xx",
            "conditionThreshold": {
                "filter": (
                    'metric.type="run.googleapis.com/request_count" '
                    'resource.type="cloud_run_revision" '
                    'resource.label.service_name="muvlog-api" '
                    'metric.label.response_code_class="5xx"'
                ),
                "comparison": "COMPARISON_GT",
                "thresholdValue": 5,
                "duration": "300s",
                "aggregations": [{
                    "alignmentPeriod": "300s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_SUM",
                    "groupByFields": [],
                }],
                "trigger": {"count": 1},
            },
        },
    ],
    "notificationChannels": [canal_name],
    "alertStrategy": {"autoClose": "1800s"},
})
print("politica:", politica["name"])
print("RESULTADO: alerta minimo configurado (uptime 1min + 5xx + email)")
