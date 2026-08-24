FROM python:3.12-slim

ENV PIPER_VOICE=es_ES-sharvard-medium
ENV PIPER_DATA_DIR=/voices

RUN apt-get update \
    && apt-get install -y --no-install-recommends espeak-ng libsndfile1 curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir "piper-tts[http]"

RUN mkdir -p /voices

EXPOSE 5000

CMD python -m piper.download_voices "$PIPER_VOICE" --data-dir "$PIPER_DATA_DIR" \
    && python -m piper.http_server --host 0.0.0.0 --port 5000 --data-dir "$PIPER_DATA_DIR" -m "$PIPER_VOICE"
